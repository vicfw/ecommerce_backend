import { Context } from "hono";
import { prisma } from "../config/prismaClient";

export const getCart = async (c: Context) => {
  const user = c.get("user");

  const cart = await prisma.cart.findFirst({
    where: { userId: user.id },
    include: { cartItems: { include: { product: true } } },
  });

  return c.json({
    success: true,
    data: cart,
    message: "Cart retrieved successfully ",
  });
};

export const createCart = async (c: Context) => {
  const { productId, quantity = 1, price } = await c.req.json();
  const user = c.get("user");

  const product = await prisma.product.findFirst({
    where: { id: +productId },
  });

  if (
    !product?.quantity ||
    product.quantity < quantity ||
    product.quantity < 0
  ) {
    return c.json({
      success: false,
      message: "Product quantity is not enough",
    });
  }

  // Use a transaction to ensure atomicity and consistency
  const cart = await prisma.$transaction(async (prisma) => {
    const existingCart = await prisma.cart.findFirst({
      where: { userId: user.id },
    });

    if (existingCart) {
      const isCartItemExists = await prisma.cartItem.findFirst({
        where: { cartId: existingCart.id, productId: +productId },
      });
      if (isCartItemExists) {
        // Update existing cart
        return prisma.cart.update({
          where: { userId: user.id },
          data: {
            price: parseFloat(price),
            cartItems: {
              updateMany: {
                where: { productId: +productId },
                data: { quantity: +quantity },
              },
            },
          },
          include: { cartItems: { include: { product: true } } },
        });
      } else {
        // add new added product to cart
        return prisma.cart.update({
          where: { userId: user.id },
          data: {
            userId: user.id,
            price: parseFloat(price),
            cartItems: {
              create: { productId: +productId, quantity: +quantity },
            },
          },
          include: { cartItems: { include: { product: true } } },
        });
      }
    } else {
      // Create a new cart
      return prisma.cart.create({
        data: {
          userId: user.id,
          price: parseFloat(price),
          cartItems: {
            create: { quantity: +quantity, productId: +productId },
          },
        },
        include: { cartItems: { include: { product: true } } },
      });
    }
  });

  return c.json({
    success: true,
    data: cart,
    message: `Cart ${cart ? "updated" : "created"} successfully`,
  });
};

export const deleteCart = async (c: Context) => {
  const user = c.get("user");

  await prisma.cart.delete({ where: { userId: user.id } });

  return c.json({
    success: true,
    message: "Cart deleted successfully",
  });
};
