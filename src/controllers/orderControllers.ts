import { OrderStatus } from "@prisma/client";
import { and, eq } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../config/prismaClient";
import { db } from "../db";
import {
  joinAddressQuery,
  joinOrderItemQuery,
  joinUserQuery,
} from "../db/common-queries/common-queries";
import { addressesTable } from "../db/schema/addresses";
import { cartsTable } from "../db/schema/carts";
import { orderItemsTable } from "../db/schema/orderItems";
import { ordersTable } from "../db/schema/orders";
import { productsTable } from "../db/schema/products";
import { usersTable } from "../db/schema/users";
import { cartGetter } from "./cartControllers";

export const createOrder = async (c: Context) => {
  const user = c.get("user");

  const result = await db.transaction(async (trx) => {
    const cart = await cartGetter(db, user.id);

    const [defaultAddress] = await db
      .select()
      .from(addressesTable)
      .where(
        and(
          eq(addressesTable.userId, user.id),
          eq(addressesTable.isDefault, true)
        )
      );

    if (!defaultAddress) {
      throw new HTTPException(400, { message: "Please add a default address" });
    }

    if (!cart || cart.cartItems.length === 0) {
      throw new HTTPException(400, { message: "Cart is empty" });
    }

    const [order] = await db
      .insert(ordersTable)
      .values({
        userId: user.id,
        addressId: defaultAddress.id,
        totalAmount: cart.discountPrice || 0,
        profitFromDiscount: cart.profitFromDiscount,
        deliveryAmount: cart.deliveryCost.cost,
      })
      .returning();

    cart.cartItems.forEach(async (item) => {
      await db.insert(orderItemsTable).values({
        orderId: order.id,
        price: item.itemPrice,
        productId: item.productId,
        quantity: item.quantity,
      });
    });

    // Delete the cart after order is created
    await db.delete(cartsTable).where(eq(cartsTable.userId, user.id));

    return order;
  });

  return c.json({
    success: true,
    data: result,
    message: "Order created successfully",
  });
};

export const getOrder = async (c: Context) => {
  const { id } = c.req.param();

  const [order] = await db
    .select({
      id: ordersTable.id,
      totalAmount: ordersTable.totalAmount,
      profitFromDiscount: ordersTable.profitFromDiscount,
      status: ordersTable.status,
      deliveryAmount: ordersTable.deliveryAmount,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
      // joins
      orderItem: joinOrderItemQuery(),
      user: joinUserQuery(),
      address: joinAddressQuery(),
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(addressesTable, eq(ordersTable.addressId, addressesTable.id))
    .leftJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.orderId))
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(ordersTable.id, +id))
    .groupBy(ordersTable.id);

  return c.json({
    success: true,
    data: order,
    message: "Order retrieved successfully",
  });
};

export const getOrders = async (c: Context) => {
  const status = c.req.query("status") as OrderStatus | undefined;
  const user = c.get("user");

  const order = await prisma.order.findMany({
    where: {
      userId: user.id,
      ...(status ? { status } : undefined),
    },
    select: {
      status: true,
      createdAt: true,
      updatedAt: true,
      id: true,
      totalAmount: true,
      profitFromDiscount: true,
      orderItem: { select: { product: true } },
    },
  });

  return c.json({
    success: true,
    data: order,
    message: "Order retrieved successfully",
  });
};

export const getStatusCount = async (c: Context) => {
  const user = c.get("user");

  const status = await prisma.order.groupBy({
    by: ["status"],
    where: {
      userId: user.id,
    },
    _count: {
      status: true,
    },
  });

  return c.json({
    success: true,
    data: status,
    message: "status count retrieved successfully",
  });
};
