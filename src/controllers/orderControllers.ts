import { and, asc, count, desc, eq } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { isOrderStatus } from "../constants/orderStatus";
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
    const cart = await cartGetter(trx, user.id);

    const [defaultAddress] = await trx
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

    const [order] = await trx
      .insert(ordersTable)
      .values({
        userId: user.id,
        addressId: defaultAddress.id,
        totalAmount: cart.discountPrice || 0,
        profitFromDiscount: cart.profitFromDiscount,
        deliveryAmount: cart.deliveryCost?.cost || 0,
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

    await trx.delete(cartsTable).where(eq(cartsTable.userId, user.id));

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
    .groupBy(ordersTable.id, usersTable.id, addressesTable.id);

  return c.json({
    success: true,
    data: order,
    message: "Order retrieved successfully",
  });
};

export const getOrders = async (c: Context) => {
  const status = c.req.query("status");
  const user = c.get("user");

  const conditions = [eq(ordersTable.userId, user.id)];
  if (status) {
    if (!isOrderStatus(status)) {
      throw new HTTPException(400, { message: "Invalid order status" });
    }
    conditions.push(eq(ordersTable.status, status));
  }

  const orders = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
      totalAmount: ordersTable.totalAmount,
      profitFromDiscount: ordersTable.profitFromDiscount,
      orderItem: joinOrderItemQuery(),
    })
    .from(ordersTable)
    .where(and(...conditions))
    .leftJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .groupBy(ordersTable.id);

  return c.json({
    success: true,
    data: orders,
    message: "Order retrieved successfully",
  });
};

export const getStatusCount = async (c: Context) => {
  const user = c.get("user");

  const status = await db
    .select({
      status: ordersTable.status,
      count: count(ordersTable.status),
    })
    .from(ordersTable)
    .where(eq(ordersTable.userId, user.id))
    .groupBy(ordersTable.status);

  return c.json({
    success: true,
    data: status,
    message: "status count retrieved successfully",
  });
};

export const getAdminOrders = async (c: Context) => {
  const url = c.req.query();
  const status = url.status;
  const page = +(url.page ?? 1);
  const perPage = +(url.perPage ?? 10);
  const skip = page > 1 ? (page - 1) * perPage : 0;

  const conditions = [];
  if (status && isOrderStatus(status)) {
    conditions.push(eq(ordersTable.status, status));
  }

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  const sortField = url.sort === "createdAt" ? ordersTable.createdAt : ordersTable.id;
  const orderByClause =
    url.order === "ASC" ? asc(sortField) : desc(sortField);

  const orders = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
      totalAmount: ordersTable.totalAmount,
      profitFromDiscount: ordersTable.profitFromDiscount,
      deliveryAmount: ordersTable.deliveryAmount,
      user: joinUserQuery(),
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(perPage)
    .offset(skip);

  const [totalResult] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(whereClause);

  return c.json({
    success: true,
    data: orders,
    total: totalResult.count,
    message: "Orders retrieved successfully",
  });
};

export const getAdminOrder = async (c: Context) => {
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
    .groupBy(ordersTable.id, usersTable.id, addressesTable.id);

  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }

  return c.json({
    success: true,
    data: order,
    message: "Order retrieved successfully",
  });
};

export const updateAdminOrderStatus = async (c: Context) => {
  const { id } = c.req.param();
  const { status } = await c.req.json();

  if (!isOrderStatus(status)) {
    throw new HTTPException(400, { message: "Invalid order status" });
  }

  const [updatedOrder] = await db
    .update(ordersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(ordersTable.id, +id))
    .returning();

  if (!updatedOrder) {
    throw new HTTPException(404, { message: "Order not found" });
  }

  return c.json({
    success: true,
    data: updatedOrder,
    message: "Order status updated successfully",
  });
};
