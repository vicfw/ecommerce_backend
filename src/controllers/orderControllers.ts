import { Context } from "hono";
import { prisma } from "../config/prismaClient";
import { HTTPException } from "hono/http-exception";
import { OrderStatus } from "@prisma/client";

export const createOrder = async (c: Context) => {
  const user = c.get("user");

  const cart = await prisma.cart.findFirst({
    where: { userId: user.id },
    include: { cartItems: { include: { product: true } } },
  });

  const defaultAddress = await prisma.address.findFirst({
    where: { userId: user.id, isDefault: true },
  });

  if (!defaultAddress) {
    throw new HTTPException(400, { message: "Please add a default address" });
  }

  if (!cart || cart.cartItems.length === 0) {
    throw new HTTPException(400, { message: "Cart is empty" });
  }

  // Create the order
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      addressId: defaultAddress.id,
      totalAmount: cart.discountPrice,
    },
  });

  // Create OrderItems based on CartItems
  const orderItemsData = cart.cartItems.map((cartItem) => ({
    orderId: order.id,
    productId: cartItem.productId,
    quantity: cartItem.quantity,
    price: cartItem.itemPrice,
  }));

  await prisma.orderItem.createMany({
    data: orderItemsData,
  });

  // Delete the cart after order is created
  await prisma.cart.delete({
    where: { id: cart.id },
  });

  return c.json({
    success: true,
    data: order,
    message: "Order created successfully",
  });
};

export const getOrder = async (c: Context) => {
  const { id } = c.req.param();

  const order = await prisma.order.findFirst({
    where: {
      id: +id,
    },
    include: { orderItem: { include: { product: true } } },
  });

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
      orderItem: { select: { product: true } },
    },
  });

  return c.json({
    success: true,
    data: order,
    message: "Order retrieved successfully",
  });
};
