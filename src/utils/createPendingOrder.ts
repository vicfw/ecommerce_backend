import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { addressesTable } from "../db/schema/addresses";
import { orderItemsTable } from "../db/schema/orderItems";
import { ordersTable } from "../db/schema/orders";
import { cartGetter } from "../controllers/cartControllers";
import {
  groupQuantitiesByProductId,
  reservationExpiryDate,
  reserve,
} from "./inventory";

/**
 * Creates a pending order from the user's cart and reserves inventory.
 * Does NOT delete the cart — caller deletes it only after payment gateway accepts.
 */
export const createPendingOrderFromCart = async (userId: number) => {
  return db.transaction(async (trx) => {
    const cart = await cartGetter(trx, userId);

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
      throw new HTTPException(400, { message: "Please add a default address" });
    }

    if (!cart || cart.cartItems.length === 0) {
      throw new HTTPException(400, { message: "Cart is empty" });
    }

    const quantities = groupQuantitiesByProductId(cart.cartItems);
    await reserve(trx, quantities);

    const [order] = await trx
      .insert(ordersTable)
      .values({
        userId,
        addressId: defaultAddress.id,
        totalAmount: cart.discountPrice || 0,
        profitFromDiscount: cart.profitFromDiscount,
        deliveryAmount: cart.deliveryCost?.cost || 0,
        status: "pending",
        inventoryStatus: "reserved",
        reservationExpiresAt: reservationExpiryDate(),
      })
      .returning();

    for (const item of cart.cartItems) {
      await trx.insert(orderItemsTable).values({
        orderId: order.id,
        price: item.itemPrice,
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    return order;
  });
};
