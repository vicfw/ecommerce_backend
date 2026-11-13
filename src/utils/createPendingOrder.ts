import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { addressesTable } from "../db/schema/addresses";
import { orderItemsTable } from "../db/schema/orderItems";
import { ordersTable } from "../db/schema/orders";
import { cartGetter } from "../controllers/cartControllers";
import { isUniqueViolation } from "./isUniqueViolation";
import { lockUserRow } from "./lockUser";
import {
  afterInventoryCommit,
  cancelReservedOrder,
  groupQuantitiesByProductId,
  quantitiesForOrder,
  reservationExpiryDate,
  reserve,
  type DbOrTrx,
} from "./inventory";
import { syncCartCoupon } from "./coupon";

type PendingOrder = typeof ordersTable.$inferSelect;
type PendingOutcome =
  | { kind: "order"; order: PendingOrder; touchedProductIds: number[] }
  | { kind: "error"; message: string; touchedProductIds: number[] };
type CartSnapshot = NonNullable<Awaited<ReturnType<typeof cartGetter>>>;

export const PAYMENT_INIT_STALE_MS = 30_000;

export const orderPayableAmount = (order: {
  totalAmount: number | null;
  deliveryAmount: number | null;
  couponAmount?: number | null;
}) =>
  Math.max(0, (Number(order.totalAmount) || 0) - (Number(order.couponAmount) || 0)) +
  (Number(order.deliveryAmount) || 0);

export const isPaymentInFlight = (
  order: {
    paymentTrackId: string | null;
    paymentInitStartedAt: Date | string | null;
  },
  now = Date.now()
) => {
  if (order.paymentTrackId) return true;
  if (!order.paymentInitStartedAt) return false;
  const startedAt = new Date(order.paymentInitStartedAt).getTime();
  if (Number.isNaN(startedAt)) return false;
  return now - startedAt <= PAYMENT_INIT_STALE_MS;
};

const moneyFromCart = (cart: CartSnapshot) => ({
  totalAmount: cart.discountPrice || 0,
  profitFromDiscount: cart.profitFromDiscount,
  couponCode: cart.couponCode ?? null,
  couponAmount: cart.couponAmount || 0,
  deliveryAmount: cart.deliveryCost?.cost || 0,
});

const quantitiesMatch = (
  left: Map<number, number>,
  right: Map<number, number>
) => {
  if (left.size !== right.size) {
    return false;
  }

  for (const id of left.keys()) {
    if (left.get(id) !== right.get(id)) {
      return false;
    }
  }

  return true;
};

const loadPendingReservedOrder = async (trx: DbOrTrx, userId: number) => {
  const [pending] = await trx
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.userId, userId),
        eq(ordersTable.status, "pending"),
        eq(ordersTable.inventoryStatus, "reserved")
      )
    )
    .for("update");

  return pending ?? null;
};

const syncPendingOrderFromCart = async (
  trx: DbOrTrx,
  pending: PendingOrder,
  cart: CartSnapshot
) => {
  const [updated] = await trx
    .update(ordersTable)
    .set({
      ...moneyFromCart(cart),
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, pending.id))
    .returning();

  for (const item of cart.cartItems) {
    await trx
      .update(orderItemsTable)
      .set({ price: item.itemPrice })
      .where(
        and(
          eq(orderItemsTable.orderId, pending.id),
          eq(orderItemsTable.productId, item.productId)
        )
      );
  }

  return updated ?? pending;
};

const insertOrderFromCart = async (
  trx: DbOrTrx,
  userId: number,
  cart: CartSnapshot,
  addressId: number
) => {
  const quantities = groupQuantitiesByProductId(cart.cartItems);
  await reserve(trx, quantities);

  const [order] = await trx
    .insert(ordersTable)
    .values({
      userId,
      addressId,
      ...moneyFromCart(cart),
      status: "pending",
      inventoryStatus: "reserved",
      reservationExpiresAt: reservationExpiryDate(),
    })
    .returning();

  if (!order) {
    throw new HTTPException(500, { message: "Failed to create order" });
  }

  for (const item of cart.cartItems) {
    await trx.insert(orderItemsTable).values({
      orderId: order.id,
      price: item.itemPrice,
      productId: item.productId,
      quantity: item.quantity,
    });
  }

  return order;
};

const unwrapOutcome = (outcome: PendingOutcome): PendingOrder => {
  if (outcome.kind === "order") {
    return outcome.order;
  }
  throw new HTTPException(400, { message: outcome.message });
};

/**
 * Creates or reuses a pending reserved order for the user.
 * Serializes on the user row. Does not delete the cart.
 */
export const createPendingOrderFromCart = async (
  userId: number
): Promise<PendingOrder> => {
  try {
    const outcome = await db.transaction(async (trx): Promise<PendingOutcome> => {
      await lockUserRow(trx, userId);

      let cart = await cartGetter(trx, userId);
      if (cart) {
        await syncCartCoupon(trx, cart.id);
        cart = await cartGetter(trx, userId);
      }
      const pending = await loadPendingReservedOrder(trx, userId);
      const cartItems = cart?.cartItems ?? [];
      const cartEmpty = cartItems.length === 0;
      const touchedProductIds: number[] = [];

      if (pending) {
        const paymentInFlight = isPaymentInFlight(pending);

        if (cartEmpty) {
          if (paymentInFlight) {
            return { kind: "order", order: pending, touchedProductIds };
          }

          const pendingQuantities = await quantitiesForOrder(trx, pending.id);
          touchedProductIds.push(...pendingQuantities.keys());
          await cancelReservedOrder(trx, pending.id);
          return {
            kind: "error",
            message: "Cart is empty",
            touchedProductIds,
          };
        }

        const pendingQuantities = await quantitiesForOrder(trx, pending.id);
        const cartQuantities = groupQuantitiesByProductId(cartItems);
        if (
          quantitiesMatch(pendingQuantities, cartQuantities) ||
          paymentInFlight
        ) {
          if (!paymentInFlight && cart) {
            return {
              kind: "order",
              order: await syncPendingOrderFromCart(trx, pending, cart),
              touchedProductIds,
            };
          }
          return { kind: "order", order: pending, touchedProductIds };
        }

        touchedProductIds.push(...pendingQuantities.keys());
        await cancelReservedOrder(trx, pending.id);
      } else if (cartEmpty) {
        return { kind: "error", message: "Cart is empty", touchedProductIds };
      }

      const [defaultAddress] = await trx
        .select()
        .from(addressesTable)
        .where(
          and(
            eq(addressesTable.userId, userId),
            eq(addressesTable.isDefault, true)
          )
        );

      if (!defaultAddress) {
        return {
          kind: "error",
          message: "Please add a default address",
          touchedProductIds,
        };
      }

      if (!cart) {
        return { kind: "error", message: "Cart is empty", touchedProductIds };
      }

      const order = await insertOrderFromCart(
        trx,
        userId,
        cart,
        defaultAddress.id
      );
      touchedProductIds.push(
        ...groupQuantitiesByProductId(cart.cartItems).keys()
      );

      return { kind: "order", order, touchedProductIds };
    });

    await afterInventoryCommit(outcome.touchedProductIds);
    return unwrapOutcome(outcome);
  } catch (error) {
    if (error instanceof HTTPException || !isUniqueViolation(error)) {
      throw error;
    }

    return db.transaction(async (trx) => {
      await lockUserRow(trx, userId);
      const pending = await loadPendingReservedOrder(trx, userId);
      if (!pending) {
        throw new HTTPException(500, { message: "Failed to create order" });
      }
      return pending;
    });
  }
};
