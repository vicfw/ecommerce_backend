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
  cancelReservedOrder,
  groupQuantitiesByProductId,
  quantitiesForOrder,
  reservationExpiryDate,
  reserve,
  type DbOrTrx,
} from "./inventory";

type PendingOrder = typeof ordersTable.$inferSelect;
type PendingOutcome =
  | { kind: "order"; order: PendingOrder }
  | { kind: "error"; message: string };

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

const insertOrderFromCart = async (
  trx: DbOrTrx,
  userId: number,
  cart: NonNullable<Awaited<ReturnType<typeof cartGetter>>>,
  addressId: number
) => {
  const quantities = groupQuantitiesByProductId(cart.cartItems);
  await reserve(trx, quantities);

  const [order] = await trx
    .insert(ordersTable)
    .values({
      userId,
      addressId,
      totalAmount: cart.discountPrice || 0,
      profitFromDiscount: cart.profitFromDiscount,
      deliveryAmount: cart.deliveryCost?.cost || 0,
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

      const cart = await cartGetter(trx, userId);
      const pending = await loadPendingReservedOrder(trx, userId);
      const cartItems = cart?.cartItems ?? [];
      const cartEmpty = cartItems.length === 0;

      if (pending) {
        const paymentStarted = Boolean(
          pending.paymentTrackId || pending.paymentInitStartedAt
        );

        if (cartEmpty) {
          if (paymentStarted) {
            return { kind: "order", order: pending };
          }

          await cancelReservedOrder(trx, pending.id);
          return { kind: "error", message: "Cart is empty" };
        }

        const pendingQuantities = await quantitiesForOrder(trx, pending.id);
        const cartQuantities = groupQuantitiesByProductId(cartItems);
        if (
          quantitiesMatch(pendingQuantities, cartQuantities) ||
          paymentStarted
        ) {
          return { kind: "order", order: pending };
        }

        await cancelReservedOrder(trx, pending.id);
      } else if (cartEmpty) {
        return { kind: "error", message: "Cart is empty" };
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
        return { kind: "error", message: "Please add a default address" };
      }

      if (!cart) {
        return { kind: "error", message: "Cart is empty" };
      }

      return {
        kind: "order",
        order: await insertOrderFromCart(trx, userId, cart, defaultAddress.id),
      };
    });

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
