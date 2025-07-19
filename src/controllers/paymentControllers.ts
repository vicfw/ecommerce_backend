import { eq } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { ordersTable } from "../db/schema/orders";

export const paymentRequest = async (c: Context) => {
  const body = await c.req.json();

  const response = await fetch(process.env.ZIBAL_REQUEST_API_URL!, {
    method: "POST",
    body: JSON.stringify({
      merchant: process.env.ZIBAL_MERCHANT_ID,
      callbackUrl: `${process.env.FRONTEND_URL}/payment/loader`,
      amount: body.amount,
      orderId: body.orderId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  return c.json({
    success: true,
    data: await response.json(),
  });
};

export const verifyPayment = async (c: Context) => {
  const { trackId } = await c.req.json();

  // Validate trackId
  if (!trackId || typeof trackId !== "string" || trackId.trim() === "") {
    throw new HTTPException(400, {
      message: "Invalid track ID provided",
    });
  }

  try {
    // Validate environment variables
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

    // Check if the request was successful
    if (!response.ok) {
      throw new HTTPException(502, {
        message: `Payment gateway error: ${response.status} ${response.statusText}`,
      });
    }

    const verificationData = await response.json();

    // Validate response structure
    if (!verificationData || typeof verificationData !== "object") {
      throw new HTTPException(502, {
        message: "Invalid response from payment gateway",
      });
    }

    // Check if result field exists
    if (typeof verificationData.result !== "number") {
      throw new HTTPException(502, {
        message: "Invalid response format from payment gateway",
      });
    }

    if (verificationData.result === 100 || verificationData.result === 201) {
      // Validate orderId before processing
      if (!verificationData.orderId) {
        throw new HTTPException(502, {
          message: "Order ID missing from payment gateway response",
        });
      }

      const orderId = parseInt(verificationData.orderId);

      if (isNaN(orderId) || orderId <= 0) {
        throw new HTTPException(400, {
          message: "Invalid order ID received from payment gateway",
        });
      }

      // Check if order already exists and its current status
      const existingOrder = await db.query.ordersTable.findFirst({
        where: eq(ordersTable.id, orderId),
      });

      if (!existingOrder) {
        throw new HTTPException(404, {
          message: "Order not found",
        });
      }

      // Prevent processing if order is already completed
      if (
        existingOrder.status === "COMPLETED" ||
        existingOrder.status === "CANCELLED"
      ) {
        return c.json({
          success: false,
          message: `Order is already ${existingOrder.status.toLowerCase()}`,
          data: verificationData,
        });
      }

      // If order is already PROCESSING, return success without updating
      if (existingOrder.status === "PROCESSING") {
        return c.json({
          success: true,
          message: "Payment was already processed successfully",
          data: verificationData,
        });
      }

      // Update order status only if it's not already PROCESSING
      const [updatedOrder] = await db
        .update(ordersTable)
        .set({ status: "PROCESSING" })
        .where(eq(ordersTable.id, orderId))
        .returning();

      if (!updatedOrder) {
        throw new HTTPException(500, {
          message: "Error while updating order status",
        });
      }

      // Payment was successful, return a success response
      return c.json({
        success: true,
        message: "Payment was successful",
        data: verificationData,
      });
    } else {
      // Handle specific error codes
      let errorMessage = "Payment verification failed";

      switch (verificationData.result) {
        case 102:
          errorMessage = "Merchant ID is invalid";
          break;
        case 103:
          errorMessage = "Merchant is not active";
          break;
        case 104:
          errorMessage = "Merchant is not authorized";
          break;
        case 105:
          errorMessage = "Invalid amount";
          break;
        case 106:
          errorMessage = "Invalid callback URL";
          break;
        case 107:
          errorMessage = "Invalid order ID";
          break;
        case 108:
          errorMessage = "Invalid track ID";
          break;
        case 109:
          errorMessage = "Payment not found";
          break;
        case 110:
          errorMessage = "Payment already verified";
          break;
        case 111:
          errorMessage = "Payment verification failed";
          break;
        default:
          errorMessage = `Payment verification failed with code: ${verificationData.result}`;
      }

      // Verification failed
      return c.json({
        success: false,
        message: errorMessage,
        data: verificationData,
      });
    }
  } catch (error) {
    // Handle network errors and other exceptions
    if (error instanceof HTTPException) {
      throw error;
    }

    console.error("Payment verification error:", error);

    throw new HTTPException(500, {
      message: "Internal server error during payment verification",
    });
  }
};
