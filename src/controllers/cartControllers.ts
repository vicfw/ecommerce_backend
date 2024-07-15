import { Context } from "hono";
import { prisma } from "../config/prismaClient";
import { HTTPException } from "hono/http-exception";

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

export const cartLength = async (c: Context) => {
  const user = c.get("user");

  const cart = await prisma.cart.findFirst({
    where: { userId: user.id },
  });

  const cartItemCount = await prisma.cartItem.aggregate({
    _sum: { quantity: true },
    where: { cartId: cart?.id },
  });

  return c.json({
    success: true,
    data: cartItemCount._sum?.quantity || 0,
    message: "Cart length retrieved successfully",
  });
};

export const createCart = async (c: Context) => {
  const { productId, quantity = 1 } = await c.req.json();
  const user = c.get("user");

  if (quantity === 0 || quantity < 0) {
    throw new HTTPException(400, {
      message: "quantity can be 0 or negative number",
    });
  }

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
        const isIncreaseQuantity = isCartItemExists?.quantity < quantity;

        // Update existing cart
        return prisma.cart.update({
          where: { userId: user.id },
          data: {
            price: isIncreaseQuantity
              ? existingCart.price + product.price
              : existingCart.price - product.price,
            cartItems: {
              updateMany: {
                where: { productId: +productId },
                data: {
                  quantity: parseInt(quantity),
                },
              },
            },
          },
          select: {
            userId: true,
            createdAt: true,
            updatedAt: true,
            id: true,
            price: true,
            cartItems: {
              select: { product: true, quantity: true, id: true },
            },
          },
        });
      } else {
        // add new added product to cart
        return prisma.cart.update({
          where: { userId: user.id },
          data: {
            userId: user.id,
            price: product.price,
            cartItems: {
              create: { productId: +productId, quantity: +quantity },
            },
          },
          select: {
            userId: true,
            createdAt: true,
            updatedAt: true,
            id: true,
            price: true,
            cartItems: {
              select: { id: true, product: true, quantity: true },
            },
          },
        });
      }
    } else {
      // Create a new cart
      return prisma.cart.create({
        data: {
          userId: user.id,
          price: product.price,
          cartItems: {
            create: { quantity: +quantity, productId: +productId },
          },
        },
        select: {
          userId: true,
          createdAt: true,
          updatedAt: true,
          id: true,
          price: true,
          cartItems: {
            select: { product: true, quantity: true, id: true },
          },
        },
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

// Anon Cart Routes

export const getAnonCart = async (c: Context) => {
  const { uuid } = await c.req.header();

  const cart = await prisma.anonCart.findFirst({
    where: { id: uuid },
    include: { cartItems: { include: { product: true } } },
  });

  return c.json({
    success: true,
    data: cart,
    message: "Cart retrieved successfully ",
  });
};

export const createAnonCart = async (c: Context) => {
  let { uuid = "" } = await c.req.header();

  const { productId, quantity = 1 } = await c.req.json();

  if (quantity === 0 || quantity < 0) {
    throw new HTTPException(400, {
      message: "quantity can be 0 or negative number",
    });
  }

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
    const existingCart = await prisma.anonCart.findFirst({
      where: { id: uuid },
    });

    if (existingCart) {
      const isCartItemExists = await prisma.cartItem.findFirst({
        where: { anonCartId: existingCart.id, productId: +productId },
      });

      if (isCartItemExists) {
        const isIncreaseQuantity = isCartItemExists?.quantity < quantity;

        // Update existing cart
        return prisma.anonCart.update({
          where: { id: uuid },
          data: {
            price: isIncreaseQuantity
              ? existingCart.price + product.price
              : existingCart.price - product.price,
            cartItems: {
              updateMany: {
                where: { productId: +productId },
                data: {
                  quantity: parseInt(quantity),
                },
              },
            },
          },
          select: {
            createdAt: true,
            updatedAt: true,
            id: true,
            price: true,
            cartItems: {
              select: {
                product: true,
                quantity: true,
                id: true,
              },
            },
          },
        });
      } else {
        // add new added product to cart
        return prisma.anonCart.update({
          where: { id: uuid },
          data: {
            price: product.price,
            cartItems: {
              create: {
                productId: +productId,
                quantity: +quantity,
              },
            },
          },
          select: {
            createdAt: true,
            updatedAt: true,
            id: true,
            price: true,
            cartItems: {
              select: {
                product: true,
                quantity: true,
                id: true,
              },
            },
          },
        });
      }
    } else {
      // Create a new cart
      return prisma.anonCart.create({
        data: {
          price: product.price,
          cartItems: {
            create: { quantity: +quantity, productId: +productId },
          },
        },
        select: {
          createdAt: true,
          updatedAt: true,
          id: true,
          price: true,
          cartItems: {
            select: {
              product: true,
              quantity: true,
              id: true,
            },
          },
        },
      });
    }
  });

  return c.json({
    success: true,
    data: cart,
    message: `Cart ${cart ? "updated" : "created"} successfully`,
  });
};

export const anonCartLength = async (c: Context) => {
  const { uuid } = await c.req.header();

  const cart = await prisma.anonCart.findFirst({
    where: { id: uuid },
    include: { cartItems: true },
  });

  const cartItemCount = await prisma.cartItem.aggregate({
    _sum: { quantity: true },
    where: { anonCartId: cart?.id },
  });

  return c.json({
    success: true,
    data: cartItemCount._sum?.quantity || 0,
    message: "Cart length retrieved successfully",
  });
};
