import { eq } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { getLogger } from "hono-pino";
import { db } from "../db";
import { cartGetter } from "./cartControllers";
import { cartsTable } from "../db/schema/carts";
import { ordersTable } from "../db/schema/orders";
import { notifyOrderPayment } from "../sms";
import { createPendingOrderFromCart } from "../utils/createPendingOrder";
import {
  deductReserved,
  expireStaleReservations,
  quantitiesForOrder,
  releaseReservation,
  releaseUnpaidOrder,
  releaseUserPendingReservedOrders,
} from "../utils/inventory";

const FAILED_CALLBACK_STATUSES = new Set([
  -2, -1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
]);

const asJsonRecord = (value: unknown): Record<string, unknown> => {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const parsePositiveInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const isFailedCallback = (success: unknown, status: unknown) => {
  const successValue = String(success ?? "");
  if (successValue === "0" || successValue === "false") {
    return true;
  }

  const statusNum = Number(status);
  return FAILED_CALLBACK_STATUSES.has(statusNum);
};

const verifyFailureMessage = (result: number) => {
  switch (result) {
    case 102:
      return "Merchant ID is invalid";
    case 103:
      return "Merchant is not active";
    case 104:
      return "Merchant is not authorized";
    case 105:
      return "Invalid amount";
    case 106:
      return "Invalid callback URL";
    case 107:
      return "Invalid order ID";
    case 108:
      return "Invalid track ID";
    case 109:
      return "Payment not found";
    case 110:
      return "Payment already verified";
    case 111:
      return "Payment verification failed";
    case 202:
      return "Payment was not completed";
    case 203:
      return "Invalid track ID";
    default:
      return `Payment verification failed with code: ${result}`;
  }
};

export const paymentRequest = async (c: Context) => {
  const log = getLogger(c);
  const user = c.get("user");

  if (!process.env.ZIBAL_REQUEST_API_URL || !process.env.ZIBAL_MERCHANT_ID) {
    throw new HTTPException(500, {
      message: "Payment gateway configuration is missing",
    });
  }

  if (!process.env.FRONTEND_URL) {
    throw new HTTPException(500, {
      message: "Frontend URL configuration is missing",
    });
  }

  await expireStaleReservations();

  // Validate cart before releasing any pending orders so a second tab / retry
  // cannot cancel an in-flight Zibal payment after the cart was already cleared.
  const cart = await cartGetter(db, user.id);
  if (!cart || cart.cartItems.length === 0) {
    throw new HTTPException(400, { message: "Cart is empty" });
  }

  await releaseUserPendingReservedOrders(user.id);

  let order: Awaited<ReturnType<typeof createPendingOrderFromCart>>;

  try {
    order = await createPendingOrderFromCart(user.id);
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    log.error({ err: error, userId: user.id }, "payment_request_order_create_failed");
    throw new HTTPException(500, { message: "Failed to create order" });
  }

  log.info(
    { orderId: order.id, userId: user.id },
    "payment_request_order_created"
  );

  const failAndRelease = async (message: string) => {
    await releaseUnpaidOrder(order.id);
    log.error({ orderId: order.id, userId: user.id }, "payment_request_failed");
    throw new HTTPException(502, { message });
  };

  let gatewayAccepted = false;

  try {
    const response = await fetch(process.env.ZIBAL_REQUEST_API_URL, {
      method: "POST",
      body: JSON.stringify({
        merchant: process.env.ZIBAL_MERCHANT_ID,
        callbackUrl: `${process.env.FRONTEND_URL}/payment/loader`,
        amount: order.totalAmount,
        orderId: order.id,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const gatewayData = await response.json().catch(() => null);

    if (!response.ok) {
      log.error(
        { orderId: order.id, status: response.status },
        "payment_request_gateway_http_error"
      );
      await failAndRelease("Payment gateway request failed");
    }

    const result = Number(
      gatewayData && typeof gatewayData === "object"
        ? (gatewayData as { result?: unknown }).result
        : NaN
    );
    const message =
      gatewayData && typeof gatewayData === "object"
        ? (gatewayData as { message?: unknown }).message
        : undefined;

    if (result !== 100 || message !== "success") {
      log.error(
        { orderId: order.id, gatewayData },
        "payment_request_gateway_rejected"
      );
      await failAndRelease("Payment gateway rejected the request");
    }

    gatewayAccepted = true;

    try {
      await db.delete(cartsTable).where(eq(cartsTable.userId, user.id));
    } catch (cartError) {
      log.error(
        { err: cartError, orderId: order.id, userId: user.id },
        "payment_request_cart_delete_failed"
      );
    }

    log.info({ orderId: order.id, userId: user.id }, "payment_request_success");

    return c.json({
      success: true,
      data: gatewayData,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    if (!gatewayAccepted) {
      await releaseUnpaidOrder(order.id);
    }
    log.error({ err: error, orderId: order.id }, "payment_request_failed");
    throw new HTTPException(502, {
      message: "Payment gateway request failed",
    });
  }
};

export const verifyPayment = async (c: Context) => {
  const log = getLogger(c);
  const body = await c.req.json();
  const trackId = String(body.trackId ?? "").trim();
  const orderIdFromClient = parsePositiveInt(body.orderId);
  const callbackStatus = Number(body.callbackStatus);

  const failUnpaidOrder = async (
    orderId: number | null,
    message: string,
    data: unknown
  ) => {
    if (orderId) {
      const released = await releaseUnpaidOrder(orderId);
      if (released) {
        void notifyOrderPayment({ orderId, kind: "failed" });
      }
    }

    return c.json({
      success: false,
      message,
      data: {
        ...asJsonRecord(data),
        orderId,
      },
    });
  };

  if (isFailedCallback(body.callbackSuccess, body.callbackStatus)) {
    log.warn(
      { orderId: orderIdFromClient, trackId, status: callbackStatus },
      "payment_callback_failed"
    );
    return failUnpaidOrder(
      orderIdFromClient,
      "Payment was cancelled or failed",
      { trackId, orderId: orderIdFromClient }
    );
  }

  if (!trackId) {
    throw new HTTPException(400, {
      message: "Invalid track ID provided",
    });
  }

  try {
    if (!process.env.ZIBAL_VERIFY_API_URL || !process.env.ZIBAL_MERCHANT_ID) {
      throw new HTTPException(500, {
        message: "Payment gateway configuration is missing",
      });
    }

    const response = await fetch(process.env.ZIBAL_VERIFY_API_URL, {
      method: "POST",
      body: JSON.stringify({
        merchant: process.env.ZIBAL_MERCHANT_ID,
        trackId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const verificationData = await response.json().catch(() => null);

    if (!response.ok || !verificationData || typeof verificationData !== "object") {
      log.error(
        { orderId: orderIdFromClient, trackId, status: response.status },
        "payment_verify_gateway_http_error"
      );
      return failUnpaidOrder(
        orderIdFromClient,
        "Payment verification failed",
        verificationData
      );
    }

    const result = Number(verificationData.result);
    const orderId =
      parsePositiveInt(verificationData.orderId) ?? orderIdFromClient;

    if (result !== 100 && result !== 201) {
      log.warn(
        { orderId, trackId, result },
        "payment_verify_rejected"
      );
      return failUnpaidOrder(
        orderId,
        Number.isNaN(result)
          ? "Invalid response format from payment gateway"
          : verifyFailureMessage(result),
        verificationData
      );
    }

    if (!orderId) {
      throw new HTTPException(502, {
        message: "Order ID missing from payment gateway response",
      });
    }

    await expireStaleReservations();

    const verifyResult = await db.transaction(async (trx) => {
      const [existingOrder] = await trx
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId))
        .for("update");

      if (!existingOrder) {
        throw new HTTPException(404, {
          message: "Order not found",
        });
      }

      if (
        existingOrder.status === "cancelled" ||
        existingOrder.status === "returned"
      ) {
        return {
          ok: false as const,
          message: `Order is already ${existingOrder.status}`,
        };
      }

      if (
        existingOrder.inventoryStatus === "deducted" ||
        existingOrder.status === "processing" ||
        existingOrder.status === "shipped" ||
        existingOrder.status === "delivered"
      ) {
        return {
          ok: true as const,
          message: "Payment was already processed successfully",
        };
      }

      if (existingOrder.inventoryStatus === "reserved") {
        const quantities = await quantitiesForOrder(trx, orderId);

        if (
          existingOrder.reservationExpiresAt &&
          existingOrder.reservationExpiresAt < new Date()
        ) {
          await releaseReservation(trx, quantities);

          await trx
            .update(ordersTable)
            .set({
              status: "cancelled",
              inventoryStatus: "released",
              updatedAt: new Date(),
            })
            .where(eq(ordersTable.id, orderId));

          return {
            ok: false as const,
            message: "Order reservation has expired",
          };
        }

        await deductReserved(trx, quantities);

        const [updatedOrder] = await trx
          .update(ordersTable)
          .set({
            status: "processing",
            inventoryStatus: "deducted",
            updatedAt: new Date(),
          })
          .where(eq(ordersTable.id, orderId))
          .returning();

        if (!updatedOrder) {
          throw new HTTPException(500, {
            message: "Error while updating order status",
          });
        }

        return {
          ok: true as const,
          message: "Payment was successful",
        };
      }

      if (existingOrder.status !== "pending") {
        return {
          ok: false as const,
          message: `Order is already ${existingOrder.status}`,
        };
      }

      const [updatedLegacyOrder] = await trx
        .update(ordersTable)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, orderId))
        .returning();

      if (!updatedLegacyOrder) {
        throw new HTTPException(500, {
          message: "Error while updating order status",
        });
      }

      return {
        ok: true as const,
        message: "Payment was successful",
      };
    });

    if (verifyResult.ok) {
      log.info(
        { orderId, trackId },
        verifyResult.message === "Payment was already processed successfully"
          ? "payment_already_processed"
          : "payment_verified"
      );

      if (verifyResult.message !== "Payment was already processed successfully") {
        void notifyOrderPayment({ orderId, kind: "success" });
      }
    } else if (verifyResult.message === "Order reservation has expired") {
      log.warn({ orderId, trackId }, "payment_reservation_expired");
      void notifyOrderPayment({ orderId, kind: "failed" });
    } else {
      log.warn({ orderId, trackId }, "payment_verify_failed");
    }

    return c.json({
      success: verifyResult.ok,
      message: verifyResult.message,
      data: {
        ...asJsonRecord(verificationData),
        orderId,
      },
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    log.error(
      { err: error, orderId: orderIdFromClient, trackId },
      "payment_verify_unexpected_error"
    );

    if (orderIdFromClient) {
      const released = await releaseUnpaidOrder(orderIdFromClient);
      if (released) {
        void notifyOrderPayment({
          orderId: orderIdFromClient,
          kind: "failed",
        });
      }
      return c.json({
        success: false,
        message: "Payment verification failed",
        data: { trackId, orderId: orderIdFromClient },
      });
    }

    throw new HTTPException(500, {
      message: "Internal server error during payment verification",
    });
  }
};
