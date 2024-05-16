import { Context } from "hono";
import { prisma } from "../config/prismaClient";

export const createOrder = async (c: Context) => {
  const { addressId } = await c.req.json();
  const user = c.get("user");

  const cart = await prisma.cart.findFirst({
    where: { userId: user.id },
    include: { cartItems: { include: { product: true } } },
  });

  if (!cart) {
    return c.json({
      success: false,
      message: "Cart is empty",
    });
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      addressId,
      totalAmount: cart?.price,
      items: {
        create: {
          cartId: cart.id,
        },
      },
    },
    include: {
      items: {
        include: {
          cart: { include: { cartItems: { include: { product: true } } } },
        },
      },
    },
  });

  return c.json({
    success: true,
    data: order,
    message: "Address created successfully",
  });
};
