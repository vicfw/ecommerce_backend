import { Context } from "hono";
import { prisma } from "../config/prismaClient";
import { HTTPException } from "hono/http-exception";
import {
  calculatePriceAfterDiscount,
  calculateProfit,
} from "../utils/calculateProfit";

export const getCart = async (c: Context) => {
  const user = c.get("user");

  const cart = await prisma.cart.findFirst({
    where: { userId: user.id },
    include: {
      cartItems: {
        select: { quantity: true, product: true, itemPrice: true, id: true },
        orderBy: { id: "desc" },
      },
    },
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

  if (!cart) {
    return c.json({
      success: true,
      data: 0,
      message: "Cart length retrieved successfully",
    });
  }

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
  const { productId, increment } = await c.req.json();
  const user = c.get("user");

  // Check if the product exists and has a valid quantity
  const product = await prisma.product.findFirst({ where: { id: +productId } });

  if (!product?.quantity || product.quantity < 0) {
    throw new HTTPException(400, {
      message: "Product quantity is not enough",
      cause: "quantity limit",
    });
  }

  // Use a transaction to ensure atomicity and consistency
  const cart = await prisma.$transaction(async (prisma) => {
    const existingCart = await prisma.cart.findFirst({
      where: { userId: user.id },
    });

    if (!existingCart) {
      // Create a new cart if it doesn't exist
      return prisma.cart.create({
        data: {
          userId: user.id,
          price: product.price,
          discountPrice: calculatePriceAfterDiscount(
            product.price,
            product.discount
          ),
          profitFromDiscount: calculateProfit(product.price, product.discount),
          totalDiscountPercentage: product.discount,
          cartItems: {
            create: {
              quantity: 1,
              productId: +productId,
              itemPrice: product.price,
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
              itemPrice: true,
              id: true,
            },
          },
        },
      });
    }

    const existingCartItem = await prisma.cartItem.findFirst({
      where: { cartId: existingCart.id, productId: +productId },
    });

    const discountPrice = await calculateDiscountPrice(
      increment,
      product.price,
      product.discount,
      existingCart.discountPrice
    );

    const profitFromDiscount = await calculateProfitFromDiscount(
      increment,
      product.price,
      product.discount,
      existingCart.profitFromDiscount
    );

    if (existingCartItem) {
      // Check if the cart item quantity exceeds the product quantity
      const updatedQuantity = increment
        ? existingCartItem.quantity + 1
        : existingCartItem.quantity - 1;
      const updatedItemPrice = increment
        ? existingCartItem.itemPrice + product.price
        : existingCartItem.itemPrice - product.price;

      // Ensure the updated quantity does not exceed product quantity
      if (updatedQuantity > product.quantity) {
        throw new HTTPException(400, {
          message: "Product quantity is not enough",
          cause: "quantity limit",
        });
      }

      // Update existing cart item
      return prisma.cart.update({
        where: { userId: user.id },
        data: {
          price: increment
            ? existingCart.price + product.price
            : existingCart.price - product.price,
          discountPrice,
          profitFromDiscount,
          totalDiscountPercentage: product.discount,
          cartItems: {
            updateMany: {
              where: { productId: +productId },
              data: { quantity: updatedQuantity, itemPrice: updatedItemPrice },
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
    }

    // Add new product to cart
    return prisma.cart.update({
      where: { userId: user.id },
      data: {
        price: existingCart.price + product.price,
        discountPrice,
        profitFromDiscount,
        totalDiscountPercentage: product.discount,
        cartItems: {
          create: {
            productId: +productId,
            quantity: 1,
            itemPrice: product.price,
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
          select: { id: true, product: true, quantity: true },
        },
      },
    });
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
    include: {
      cartItems: {
        orderBy: { id: "desc" },
        select: { quantity: true, product: true, itemPrice: true },
      },
    },
  });

  return c.json({
    success: true,
    data: cart,
    message: "Cart retrieved successfully ",
  });
};

export const createAnonCart = async (c: Context) => {
  const { uuid = "" } = await c.req.header();
  const { productId, increment = true } = await c.req.json();

  // Check if the product exists and has a valid quantity
  const product = await prisma.product.findFirst({
    where: { id: +productId },
  });

  if (!product?.quantity || product.quantity < 0) {
    throw new HTTPException(400, {
      message: "Product quantity is not enough",
      cause: "quantity limit",
    });
  }

  // Use a transaction to ensure atomicity and consistency
  const cart = await prisma.$transaction(async (prisma) => {
    const existingCart = await prisma.anonCart.findFirst({
      where: { id: uuid },
    });

    if (!existingCart) {
      // Create a new cart if it doesn't exist
      return prisma.anonCart.create({
        data: {
          price: product.price,
          discountPrice: calculatePriceAfterDiscount(
            product.price,
            product.discount
          ),
          profitFromDiscount: calculateProfit(product.price, product.discount),
          totalDiscountPercentage: product.discount,
          cartItems: {
            create: {
              quantity: 1,
              productId: +productId,
              itemPrice: product.price,
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
              itemPrice: true,
              id: true,
            },
          },
        },
      });
    }

    const existingCartItem = await prisma.cartItem.findFirst({
      where: { anonCartId: existingCart.id, productId: +productId },
    });
    const discountPrice = await calculateDiscountPrice(
      increment,
      product.price,
      product.discount,
      existingCart.discountPrice
    );
    const profitFromDiscount = await calculateProfitFromDiscount(
      increment,
      product.price,
      product.discount,
      existingCart.profitFromDiscount
    );

    if (existingCartItem) {
      // Determine cart item is added or removed from cart
      const updatedQuantity = increment
        ? existingCartItem.quantity + 1
        : existingCartItem.quantity - 1;
      const updatedItemPrice = increment
        ? existingCartItem.itemPrice + product.price
        : existingCartItem.itemPrice - product.price;

      // Ensure the updated quantity does not exceed product quantity
      if (updatedQuantity > product.quantity) {
        throw new HTTPException(400, {
          message: "Product quantity is not enough",
          cause: "quantity limit",
        });
      }

      // Update existing cart item
      return prisma.anonCart.update({
        where: { id: uuid },
        data: {
          price: increment
            ? existingCart.price + product.price
            : existingCart.price - product.price,
          discountPrice,
          profitFromDiscount,
          totalDiscountPercentage: product.discount,
          cartItems: {
            updateMany: {
              where: { productId: +productId },
              data: { quantity: updatedQuantity, itemPrice: updatedItemPrice },
            },
          },
        },
        select: {
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

    // Add new product to cart
    return prisma.anonCart.update({
      where: { id: uuid },
      data: {
        price: existingCart.price + product.price,
        discountPrice,
        profitFromDiscount,
        totalDiscountPercentage: product.discount,
        cartItems: {
          create: {
            productId: +productId,
            quantity: 1,
            itemPrice: product.price,
          },
        },
      },
      select: {
        createdAt: true,
        updatedAt: true,
        id: true,
        price: true,
        cartItems: {
          select: { product: true, quantity: true, id: true },
        },
      },
    });
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

export const deleteCartItem = async (c: Context) => {
  const { id } = c.req.param();
  const user = c.get("user");

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: { cartItems: true },
  });

  if (!cart) {
    throw new HTTPException(400, {
      message:
        "The system was unable to locate a cart for the specified user id",
    });
  }

  const cartItem = await prisma.cartItem.findFirst({
    where: { id: +id, cartId: cart.id },
    include: { product: true },
  });

  if (!cartItem) {
    throw new HTTPException(400, {
      message:
        "The system was unable to locate a cartItem for the specified id",
    });
  }

  if (cart.cartItems.length === 1) {
    await prisma.cart.delete({ where: { userId: user.id } });

    return c.json({
      success: true,
      message: "cartItem deleted successfully",
    });
  } else {
    const { product } = cartItem;
    const discountPrice = product.price * (product.discount / 100);
    const price = cart.price - cartItem.itemPrice;

    await prisma.cart.update({
      where: { userId: user.id },
      data: {
        price,
        profitFromDiscount: cart.profitFromDiscount - discountPrice,
        totalDiscountPercentage:
          cart.totalDiscountPercentage - product.discount,
        discountPrice: cart.discountPrice - (product.price - discountPrice),
      },
    });
  }

  await prisma.cartItem.delete({ where: { cartId: cart.id, id: +id } });

  return c.json({
    success: true,
    message: "cartItem deleted successfully",
  });
};

export const deleteAnonCartItem = async (c: Context) => {
  const { id } = c.req.param();
  const { uuid } = await c.req.header();

  const anonCart = await prisma.anonCart.findUnique({
    where: { id: uuid },
    include: { cartItems: true },
  });

  if (!anonCart) {
    throw new HTTPException(400, {
      message: "The system was unable to locate a cart for the specified UUID",
    });
  }

  await prisma.cartItem.delete({ where: { anonCartId: anonCart.id, id: +id } });

  if (anonCart.cartItems.length === 1) {
    await prisma.anonCart.update({
      where: { id: uuid },
      data: {
        price: 0,
        profitFromDiscount: 0,
        totalDiscountPercentage: 0,
        discountPrice: 0,
      },
    });
  }

  return c.json({
    success: true,
    message: "cartItem deleted successfully",
  });
};

export const matchAnonCart = async (c: Context) => {
  const { uuid } = await c.req.header();
  const { userId } = await c.req.json();

  const anonCart = await prisma.anonCart.findUnique({
    where: { id: uuid },
    include: { cartItems: true },
  });

  if (!anonCart) {
    return;
  }

  const isCartExist = await prisma.cart.findUnique({ where: { userId } });

  if (isCartExist) {
    await prisma.cart.delete({ where: { userId } });
  }

  const mappedCartItems = anonCart.cartItems.map((cartItem) => ({
    productId: cartItem.productId,
    quantity: cartItem.quantity,
    itemPrice: cartItem.itemPrice,
  }));

  const cart = await prisma.cart.create({
    data: {
      cartItems: {
        createMany: {
          data: mappedCartItems,
        },
      },
      price: anonCart?.price,
      profitFromDiscount: anonCart?.profitFromDiscount,
      discountPrice: anonCart.discountPrice,
      totalDiscountPercentage: anonCart.totalDiscountPercentage,
      userId: userId,
    },
  });

  return c.json({
    success: true,
    data: cart,
    message: "Cart replaced successfully",
  });
};

//  TODO : Convert This functions to raw sql (database side)

const calculateDiscountPrice = async (
  increment: boolean,
  productPrice: number,
  productDiscount: number,
  previousDiscount: number
) => {
  const discountPriceResult =
    (await prisma.$queryRaw`SELECT calculate_discount_price(${productPrice}, ${productDiscount}) AS discount_price`) as {
      discount_price: string;
    }[];

  const finalDiscountPrice = increment
    ? previousDiscount + parseFloat(discountPriceResult[0].discount_price)
    : previousDiscount - parseFloat(discountPriceResult[0].discount_price);

  return finalDiscountPrice;
};

const calculateProfitFromDiscount = async (
  increment: boolean,
  productPrice: number,
  productDiscount: number,
  previousProfitFromDiscount: number
) => {
  const profitPriceResult =
    (await prisma.$queryRaw`SELECT calculate_profit(${productPrice}, ${productDiscount}) AS profit`) as {
      profit: string;
    }[];

  const finalProfitFromDiscount = increment
    ? parseFloat(profitPriceResult[0].profit) + previousProfitFromDiscount
    : previousProfitFromDiscount - parseFloat(profitPriceResult[0].profit);

  return finalProfitFromDiscount;
};
