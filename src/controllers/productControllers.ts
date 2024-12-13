import { asc, eq, getTableColumns, sql } from "drizzle-orm";
import { Context } from "hono";
import { productsSeed } from "../../prisma/data";
import { prisma } from "../config/prismaClient";
import { db } from "../db";
import { badgesTable } from "../db/schema/badges";
import { badgesToProducts } from "../db/schema/badgesToProducts";
import { productsTable } from "../db/schema/products";
import { ProductTypes } from "../types";
import { builderFunc } from "../utils";

export const getProducts = async (c: Context) => {
  const query: ProductTypes.ProductQueryStringType = c.req.query();
  const pagination = builderFunc.paginationBuilder(query);

  const products = await db
    .select({
      ...getTableColumns(productsTable),
      badges: sql<string>`
    COALESCE(
      JSON_AGG(
        CASE WHEN ${badgesTable.id} IS NOT NULL 
        THEN JSON_BUILD_OBJECT(
          'id', ${badgesTable.id},
          'title', ${badgesTable.title},
          'icon', ${badgesTable.icon}  
        )
        ELSE NULL END
      ) FILTER (WHERE ${badgesTable.id} IS NOT NULL),
      '[]'
    )
  `.as("badges"),
    })
    .from(productsTable)
    .leftJoin(
      badgesToProducts,
      eq(productsTable.id, badgesToProducts.productId)
    )
    .leftJoin(badgesTable, eq(badgesToProducts.badgeId, badgesTable.id))
    .groupBy(productsTable.id)
    .limit(pagination.limit)
    .offset(pagination.skip)
    .orderBy(asc(productsTable.id));

  const allProductsCount = await db.$count(productsTable);

  return c.json({
    success: true,
    data: products,
    page: query.page ? +query.page : 1,
    total: allProductsCount,
    message: "Products retrieved successfully.",
  });
};
export const getProduct = async (c: Context) => {
  const { slug } = c.req.param();

  const product = await db
    .select({
      ...getTableColumns(productsTable),
      badges: sql<string>`
    COALESCE(
      JSON_AGG(
        CASE WHEN ${badgesTable.id} IS NOT NULL
        THEN JSON_BUILD_OBJECT(
          'id', ${badgesTable.id},
          'title', ${badgesTable.title},
          'icon', ${badgesTable.icon}
        )
        ELSE NULL END
      ) FILTER (WHERE ${badgesTable.id} IS NOT NULL),
      '[]'
    )
  `.as("badges"),
    })
    .from(productsTable)
    .leftJoin(
      badgesToProducts,
      eq(productsTable.id, badgesToProducts.productId)
    )
    .leftJoin(badgesTable, eq(badgesToProducts.badgeId, badgesTable.id))
    .where(eq(productsTable.slug, slug))
    .groupBy(productsTable.id);

  return c.json({
    success: true,
    data: product,
    message: "Product retrieved successfully.",
  });
};
export const createProduct = async (c: Context) => {
  const {
    prName,
    enName,
    price,
    images,
    description,
    quantity,
    badges,
    weight,
    discount,
  } = await c.req.json();

  const product = await db.transaction(async (tx) => {
    const [product] = await tx
      .insert(productsTable)
      .values({
        prName,
        enName,
        description,
        price,
        quantity,
        slug: enName,
        images,
        weight,
        discount,
      })
      .returning();

    const productBadgesValue = badges.map((badgeId: number) => ({
      badgeId,
      productId: product.id,
    }));

    await tx.insert(badgesToProducts).values(productBadgesValue);

    return product;
  });

  const [result] = await db
    .select({
      ...getTableColumns(productsTable),
      badges: sql<string>`
      COALESCE(
        JSON_AGG(
          CASE WHEN ${badgesTable.id} IS NOT NULL 
          THEN JSON_BUILD_OBJECT(
            'id', ${badgesTable.id},
            'title', ${badgesTable.title},
            'icon', ${badgesTable.icon}  
          )
          ELSE NULL END
        ) FILTER (WHERE ${badgesTable.id} IS NOT NULL),
        '[]'
      )
    `.as("badges"),
    })
    .from(productsTable)
    .leftJoin(
      badgesToProducts,
      eq(productsTable.id, badgesToProducts.productId)
    )
    .leftJoin(badgesTable, eq(badgesToProducts.badgeId, badgesTable.id))
    .where(eq(productsTable.id, product.id))
    .groupBy(productsTable.id);

  return c.json({
    success: true,
    data: result,
    message: "Product created successfully.",
  });
};
export const updateProduct = async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const [isExist] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, +id));

  if (!isExist) {
    return c.json({
      success: false,
      message: "Product not found.",
    });
  }

  const [product] = await db
    .update(productsTable)
    .set(body)
    .where(eq(productsTable.id, +id))
    .returning();

  console.log(product, "product");

  return c.json({
    success: true,
    data: product,
    message: "Product updated successfully.",
  });
};

export const deleteProduct = async (c: Context) => {
  const { id } = c.req.param();

  const result = await db.transaction(async (trx) => {
    try {
      await trx
        .delete(badgesToProducts)
        .where(eq(badgesToProducts.productId, +id));

      const deletedProduct = await trx
        .delete(productsTable)
        .where(eq(productsTable.id, +id))
        .returning();

      if (deletedProduct.length === 0) {
        return c.json({
          success: false,
          message: "Product not found.",
        });
      }

      return c.json({
        success: true,
        message: "Product deleted successfully.",
      });
    } catch (error) {
      await trx.rollback();
      return c.json({
        success: false,
        message: "Error occurred while deleting product.",
      });
    }
  });

  return result;
};

export const seedProductsData = async (c: Context) => {
  await db.delete(productsTable);

  await db.insert(productsTable).values(productsSeed);

  return c.json({
    success: true,
  });
};
