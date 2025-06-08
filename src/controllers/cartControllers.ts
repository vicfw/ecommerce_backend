import { and, desc, eq, gt, sql } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { anonCartsTable } from "../db/schema/anonCarts";
import { cartItemsTable } from "../db/schema/cartItems";
import { cartsTable } from "../db/schema/carts";
import { colorImagesTable } from "../db/schema/colorImage";
import { deliveryCostsTable } from "../db/schema/deliveryCosts";
import { productsTable } from "../db/schema/products";
import {
  calculatePriceAfterDiscount,
  calculateProfit,
} from "../utils/calculateProfit";

export const getCart = async (c: Context) => {
  const user = c.get("user");

  const cart = await cartGetter(db, user.id);

  return c.json({
    success: true,
    data: cart,
    message: "Cart retrieved successfully ",
  });
};

export const cartLength = async (c: Context) => {
  const user = c.get("user");

  const [result] = await db
    .select({
      totalItems: sql<number>`COALESCE(SUM(${cartItemsTable.quantity}), 0)`.as(
        "totalItems"
      ),
    })
    .from(cartsTable)
    .leftJoin(cartItemsTable, eq(cartItemsTable.cartId, cartsTable.id))
    .where(eq(cartsTable.userId, user.id))
    .groupBy(cartsTable.id)
    .limit(1);

  return c.json({
    success: true,
    data: result ? +result.totalItems : 0,
    message: "Cart length retrieved successfully",
  });
};

export const createCart = async (c: Context) => {
  const { productId, increment, deliveryCostId, colorImageId } =
    await c.req.json();
  const user = c.get("user");

  // Check if the product exists and has a valid quantity
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId));

  if (!product) {
    throw new HTTPException(400, {
      message: "Product not found",
      cause: "product not found",
    });
  }

  if (!product?.quantity || product.quantity < 0) {
    throw new HTTPException(400, {
      message: "Product quantity is not enough",
      cause: "quantity limit",
    });
  }

  // If colorImageId is provided, verify it exists and belongs to the product
  if (colorImageId) {
    const [colorImage] = await db
      .select()
      .from(colorImagesTable)
      .where(
        and(
          eq(colorImagesTable.id, colorImageId),
          eq(colorImagesTable.productId, productId)
        )
      );

    if (!colorImage) {
      throw new HTTPException(400, {
        message: "Invalid color image selection",
        cause: "invalid color image",
      });
    }
  }

  const cart = await db.transaction(async (trx) => {
    const [cart] = await trx
      .select()
      .from(cartsTable)
      .where(eq(cartsTable.userId, user.id))
      .limit(1);

    if (!cart) {
      const [createdCart] = await trx
        .insert(cartsTable)
        .values({
          userId: user.id,
          price: product.price,
          deliveryCostId,
          discountPrice: calculatePriceAfterDiscount(
            product.price,
            product.discount || 0
          ),
          profitFromDiscount: product.discount
            ? calculateProfit(product.price, product.discount)
            : 0,
          totalDiscountPercentage: product.discount || 0,
        })
        .returning();

      await trx.insert(cartItemsTable).values({
        cartId: createdCart.id,
        productId: product.id,
        quantity: 1,
        itemPrice: product.price,
        colorImageId: colorImageId || null,
      });

      return await cartGetter(trx, user.id);
    } else {
      const [existingCartItem] = await trx
        .select()
        .from(cartItemsTable)
        .where(
          and(
            eq(cartItemsTable.cartId, cart.id),
            eq(cartItemsTable.productId, product.id),
            eq(cartItemsTable.colorImageId, colorImageId || null)
          )
        )
        .limit(1);

      if (existingCartItem) {
        // Update existing cart item
        await trx
          .update(cartItemsTable)
          .set({
            quantity: increment
              ? sql`${cartItemsTable.quantity} + 1`
              : sql`${cartItemsTable.quantity} - 1`,
            itemPrice: increment
              ? sql`${cartItemsTable.itemPrice} + ${product.price}`
              : sql`${cartItemsTable.itemPrice} - ${product.price}`,
          })
          .where(eq(cartItemsTable.id, existingCartItem.id));
      } else {
        // Add new cart item
        await trx.insert(cartItemsTable).values({
          cartId: cart.id,
          productId: product.id,
          quantity: 1,
          itemPrice: product.price,
          colorImageId: colorImageId || null,
        });
      }

      const discountPrice = await calculateDiscountPrice(
        increment,
        product.price,
        product.discount || 0,
        cart.discountPrice || 0
      );

      const profitFromDiscount = await calculateProfitFromDiscount(
        increment,
        product.price,
        product.discount || 0,
        cart.profitFromDiscount || 0
      );

      await trx
        .update(cartsTable)
        .set({
          price: increment
            ? cart.price + product.price
            : cart.price - product.price,
          discountPrice,
          profitFromDiscount,
          totalDiscountPercentage: product.discount || 0,
        })
        .where(eq(cartsTable.id, cart.id))
        .returning();

      return await cartGetter(trx, user.id);
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

  await db.delete(cartsTable).where(eq(cartsTable.userId, user.id));

  return c.json({
    success: true,
    message: "Cart deleted successfully",
  });
};

// Anon Cart Routes
export const getAnonCart = async (c: Context) => {
  const { anoncartid } = await c.req.header();

  const cart = await anonCartGetter(db, +anoncartid);

  return c.json({
    success: true,
    data: cart,
    message: "Cart retrieved successfully ",
  });
};

export const createAnonCart = async (c: Context) => {
  const { productId, increment, deliveryCostId, colorImageId } =
    await c.req.json();
  const { anoncartid } = await c.req.header();

  // Check if the product exists and has a valid quantity
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId));

  if (!product) {
    throw new HTTPException(400, {
      message: "Product not found",
      cause: "product not found",
    });
  }

  if (!product?.quantity || product.quantity < 0) {
    throw new HTTPException(400, {
      message: "Product quantity is not enough",
      cause: "quantity limit",
    });
  }

  // If colorImageId is provided, verify it exists and belongs to the product
  if (colorImageId) {
    const [colorImage] = await db
      .select()
      .from(colorImagesTable)
      .where(
        and(
          eq(colorImagesTable.id, colorImageId),
          eq(colorImagesTable.productId, productId)
        )
      );

    if (!colorImage) {
      throw new HTTPException(400, {
        message: "Invalid color image selection",
        cause: "invalid color image",
      });
    }
  }

  const cart = await db.transaction(async (trx) => {
    const [cart] = await trx
      .select()
      .from(anonCartsTable)
      .where(eq(anonCartsTable.id, +anoncartid))
      .limit(1);

    if (!cart) {
      const [createdCart] = await trx
        .insert(anonCartsTable)
        .values({
          price: product.price,
          deliveryCostId,
          discountPrice: calculatePriceAfterDiscount(
            product.price,
            product.discount || 0
          ),
          profitFromDiscount: product.discount
            ? calculateProfit(product.price, product.discount)
            : 0,
          totalDiscountPercentage: product.discount || 0,
        })
        .returning();

      await trx.insert(cartItemsTable).values({
        cartId: createdCart.id,
        productId: product.id,
        quantity: 1,
        itemPrice: product.price,
        colorImageId: colorImageId || null,
      });

      return await anonCartGetter(trx, createdCart.id);
    } else {
      const [existingCartItem] = await trx
        .select()
        .from(cartItemsTable)
        .where(
          and(
            eq(cartItemsTable.cartId, cart.id),
            eq(cartItemsTable.productId, product.id),
            eq(cartItemsTable.colorImageId, colorImageId || null)
          )
        )
        .limit(1);

      if (existingCartItem) {
        // Update existing cart item
        await trx
          .update(cartItemsTable)
          .set({
            quantity: increment
              ? sql`${cartItemsTable.quantity} + 1`
              : sql`${cartItemsTable.quantity} - 1`,
            itemPrice: increment
              ? sql`${cartItemsTable.itemPrice} + ${product.price}`
              : sql`${cartItemsTable.itemPrice} - ${product.price}`,
          })
          .where(eq(cartItemsTable.id, existingCartItem.id));
      } else {
        // Add new cart item
        await trx.insert(cartItemsTable).values({
          cartId: cart.id,
          productId: product.id,
          quantity: 1,
          itemPrice: product.price,
          colorImageId: colorImageId || null,
        });
      }

      const discountPrice = await calculateDiscountPrice(
        increment,
        product.price,
        product.discount || 0,
        cart.discountPrice || 0
      );

      const profitFromDiscount = await calculateProfitFromDiscount(
        increment,
        product.price,
        product.discount || 0,
        cart.profitFromDiscount || 0
      );

      await trx
        .update(anonCartsTable)
        .set({
          price: increment
            ? cart.price + product.price
            : cart.price - product.price,
          discountPrice,
          profitFromDiscount,
          totalDiscountPercentage: product.discount || 0,
        })
        .where(eq(anonCartsTable.id, cart.id))
        .returning();

      return await anonCartGetter(trx, cart.id);
    }
  });

  return c.json({
    success: true,
    data: cart,
    message: `Cart ${cart ? "updated" : "created"} successfully`,
  });
};

export const anonCartLength = async (c: Context) => {
  const { anoncartid } = await c.req.header();

  const [result] = await db
    .select({
      totalItems: sql<number>`COALESCE(SUM(${cartItemsTable.quantity}), 0)`.as(
        "totalItems"
      ),
    })
    .from(anonCartsTable)
    .leftJoin(cartItemsTable, eq(cartItemsTable.cartId, anonCartsTable.id))
    .where(eq(anonCartsTable.id, +anoncartid))
    .groupBy(anonCartsTable.id)
    .limit(1);

  return c.json({
    success: true,
    data: result ? +result.totalItems : 0,
    message: "Cart length retrieved successfully",
  });
};

export const deleteCartItem = async (c: Context) => {
  const { id } = c.req.param();
  const user = c.get("user");

  return await db.transaction(async (trx) => {
    const cart = await cartGetter(trx, user.id);

    if (!cart) {
      throw new HTTPException(400, {
        message:
          "The system was unable to locate a cart for the specified user id",
      });
    }

    const [cartItem] = await trx
      .select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, +id))
      .leftJoin(productsTable, eq(productsTable.id, cartItemsTable.productId));

    if (!cartItem) {
      throw new HTTPException(400, {
        message:
          "The system was unable to locate a cartItem for the specified id",
      });
    }

    if (cart.cartItems.length === 1) {
      await trx.delete(cartsTable).where(eq(cartsTable.userId, user.id));

      return c.json({
        success: true,
        message: "cartItem deleted successfully",
      });
    } else {
      if (!cartItem.products) {
        throw new HTTPException(400, {
          message:
            "The system was unable to locate a product for the specified cartItem id",
        });
      }

      const { products } = cartItem;
      const discountPrice = products.price * (products.discount || 0 / 100);
      const price = cart.price - cartItem.cart_items.itemPrice;

      await trx
        .update(cartsTable)
        .set({
          price,
          profitFromDiscount: cart.profitFromDiscount || 0 - discountPrice,
          totalDiscountPercentage:
            cart.totalDiscountPercentage || -(products.discount || 0),
          discountPrice:
            (cart.discountPrice || 0) - (products.price - discountPrice),
        })
        .where(eq(cartsTable.userId, user.id));
    }

    await trx.delete(cartItemsTable).where(eq(cartItemsTable.id, +id));

    return c.json({
      success: true,
      message: "cartItem deleted successfully",
    });
  });
};

export const deleteAnonCartItem = async (c: Context) => {
  const { id } = c.req.param();
  const { anoncartid } = await c.req.header();

  return db.transaction(async (trx) => {
    const anonCart = await anonCartGetter(trx, +anoncartid);
    if (!anonCart) {
      throw new HTTPException(400, {
        message:
          "The system was unable to locate a cart for the specified UUID",
      });
    }

    const [cartItem] = await trx
      .select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, +id))
      .leftJoin(productsTable, eq(productsTable.id, cartItemsTable.productId));

    if (!cartItem) {
      throw new HTTPException(400, {
        message:
          "The system was unable to locate a cartItem for the specified id",
      });
    }

    if (anonCart.cartItems.length === 1) {
      await trx
        .delete(anonCartsTable)
        .where(eq(anonCartsTable.id, +anoncartid));
    } else {
      if (!cartItem.products) {
        throw new HTTPException(400, {
          message:
            "The system was unable to locate a product for the specified cartItem id",
        });
      }

      const { products } = cartItem;
      const discountPrice = products.price * (products.discount || 0 / 100);
      const price = anonCart.price - cartItem.cart_items.itemPrice;

      await trx
        .update(cartsTable)
        .set({
          price,
          profitFromDiscount: anonCart.profitFromDiscount || 0 - discountPrice,
          totalDiscountPercentage:
            anonCart.totalDiscountPercentage || -(products.discount || 0),
          discountPrice:
            (anonCart.discountPrice || 0) - (products.price - discountPrice),
        })
        .where(eq(cartsTable.userId, +anoncartid));
    }

    await db.delete(cartItemsTable).where(eq(cartItemsTable.id, +id));

    return c.json({
      success: true,
      message:
        anonCart.cartItems.length === 1
          ? "cart deleted successfully"
          : "cartItem deleted successfully",
    });
  });
};

export const matchAnonCart = async (c: Context) => {
  const { anoncartid } = await c.req.header();
  const { userId } = await c.req.json();

  const result = await db.transaction(async (trx) => {
    const anonCart = await anonCartGetter(db, +anoncartid);

    if (!anonCart) {
      throw new HTTPException(400, {
        message:
          "The system was unable to locate a cart for the specified anoncartid",
      });
    }

    const isCartExist = await db.query.cartsTable.findFirst({
      where: eq(cartsTable.userId, userId),
    });

    if (isCartExist) {
      await db.delete(cartsTable).where(eq(cartsTable.userId, userId));
    }

    const [cart] = await db
      .insert(cartsTable)
      .values({
        userId,
        price: anonCart.price,
        profitFromDiscount: anonCart.profitFromDiscount,
        totalDiscountPercentage: anonCart.totalDiscountPercentage,
        discountPrice: anonCart.discountPrice,
        deliveryCostId: anonCart.deliveryCostId,
      })
      .returning();

    anonCart.cartItems.forEach(async (item) => {
      await db.insert(cartItemsTable).values({
        cartId: cart.id,
        productId: item.productId,
        quantity: item.quantity,
        itemPrice: item.itemPrice,
      });
    });

    await db.delete(anonCartsTable).where(eq(anonCartsTable.id, +anoncartid));

    if (Array.isArray(anonCart.cartItems)) {
      anonCart.cartItems.forEach(async (item) => {
        await db.delete(cartItemsTable).where(eq(cartItemsTable.id, item.id));
      });
    }

    const cartQuery = await cartGetter(trx, cart.id);

    return cartQuery;
  });

  return c.json({
    success: true,
    data: result,
    message: "Cart replaced successfully",
  });
};
//  TODO : Convert This functions to raw sql (database side)

const calculateDiscountPrice = async (
  increment: boolean,
  productPrice: number,
  productDiscount: number,
  previousDiscount: number
): Promise<number> => {
  const discountPriceResult = await db.execute<{ discount_price: string }>(
    sql`SELECT calculate_discount_price(${productPrice}, ${productDiscount}) AS discount_price`
  );

  const calculatedDiscountPrice = parseFloat(
    discountPriceResult.rows[0].discount_price
  );

  const finalDiscountPrice = increment
    ? previousDiscount + calculatedDiscountPrice
    : previousDiscount - calculatedDiscountPrice;

  return finalDiscountPrice;
};

const calculateProfitFromDiscount = async (
  increment: boolean,
  productPrice: number,
  productDiscount: number,
  previousProfitFromDiscount: number
): Promise<number> => {
  const profitPriceResult = await db.execute<{ profit: string }>(
    sql`SELECT calculate_profit(${productPrice}, ${productDiscount}) AS profit`
  );

  const calculatedProfit = parseFloat(profitPriceResult.rows[0].profit);

  const finalProfitFromDiscount = increment
    ? calculatedProfit + previousProfitFromDiscount
    : previousProfitFromDiscount - calculatedProfit;

  return finalProfitFromDiscount;
};

export const cartGetter = async <
  T extends Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db
>(
  trx: T,
  userId: number
) => {
  // First, get the cart
  const [cart] = await trx
    .select()
    .from(cartsTable)
    .where(eq(cartsTable.userId, userId));

  if (!cart) return null;

  // Get the delivery cost if it exists
  let deliveryCost = null;
  if (cart.deliveryCostId) {
    const [cost] = await trx
      .select()
      .from(deliveryCostsTable)
      .where(eq(deliveryCostsTable.id, cart.deliveryCostId))
      .orderBy(desc(deliveryCostsTable.createdAt))
      .limit(1);

    if (cost) {
      deliveryCost = {
        id: cost.id,
        cost: cost.cost,
      };
    }
  }

  // Get the cart items with their products
  const cartItems = await trx
    .select({
      id: cartItemsTable.id,
      productId: cartItemsTable.productId,
      quantity: cartItemsTable.quantity,
      itemPrice: cartItemsTable.itemPrice,
      colorImage: {
        image: colorImagesTable.images,
        id: colorImagesTable.id,
        name: colorImagesTable.name,
      },
      product: {
        id: productsTable.id,
        quantity: productsTable.quantity,
        prName: productsTable.prName,
        enName: productsTable.enName,
        slug: productsTable.slug,
        price: productsTable.price,
        discount: productsTable.discount,
        weight: productsTable.weight,
        description: productsTable.description,
        images: productsTable.images,
        point: productsTable.point,
        createdAt: productsTable.createdAt,
        updatedAt: productsTable.updatedAt,
      },
    })
    .from(cartItemsTable)
    .where(
      and(eq(cartItemsTable.cartId, cart.id), gt(cartItemsTable.quantity, 0))
    )
    .leftJoin(productsTable, eq(productsTable.id, cartItemsTable.productId))
    .leftJoin(
      colorImagesTable,
      eq(colorImagesTable.productId, productsTable.id)
    )
    .orderBy(desc(cartItemsTable.id));

  // Return the complete cart object
  return {
    ...cart,
    deliveryCost: deliveryCost || {},
    cartItems: cartItems || [],
  };
};

const anonCartGetter = async <
  T extends Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db
>(
  trx: T,
  cartId: number // Renamed from userId for clarity since it's actually the cart ID
) => {
  // First, get the anonymous cart
  const [cart] = await trx
    .select()
    .from(anonCartsTable)
    .where(eq(anonCartsTable.id, cartId));

  if (!cart) return null;

  // Get the delivery cost if it exists
  let deliveryCost = null;
  if (cart.deliveryCostId) {
    const [cost] = await trx
      .select()
      .from(deliveryCostsTable)
      .where(eq(deliveryCostsTable.id, cart.deliveryCostId))
      .orderBy(desc(deliveryCostsTable.createdAt))
      .limit(1);

    if (cost) {
      deliveryCost = {
        id: cost.id,
        cost: cost.cost,
      };
    }
  }

  // Get the cart items with their products
  const cartItems = await trx
    .select({
      id: cartItemsTable.id,
      productId: cartItemsTable.productId,
      quantity: cartItemsTable.quantity,
      itemPrice: cartItemsTable.itemPrice,
      colorImage: {
        image: colorImagesTable.images,
        id: colorImagesTable.id,
        name: colorImagesTable.name,
      },
      product: {
        id: productsTable.id,
        quantity: productsTable.quantity,
        prName: productsTable.prName,
        enName: productsTable.enName,
        slug: productsTable.slug,
        price: productsTable.price,
        discount: productsTable.discount,
        weight: productsTable.weight,
        description: productsTable.description,
        images: productsTable.images,
        point: productsTable.point,
        createdAt: productsTable.createdAt,
        updatedAt: productsTable.updatedAt,
      },
    })
    .from(cartItemsTable)
    .where(
      and(eq(cartItemsTable.cartId, cart.id), gt(cartItemsTable.quantity, 0))
    )
    .leftJoin(productsTable, eq(productsTable.id, cartItemsTable.productId))
    .leftJoin(
      colorImagesTable,
      eq(colorImagesTable.productId, productsTable.id)
    )
    .orderBy(desc(cartItemsTable.id));

  // Return the complete cart object
  return {
    ...cart,
    deliveryCost: deliveryCost || {},
    cartItems: cartItems || [],
  };
};
