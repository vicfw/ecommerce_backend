import { Context } from "hono";
import { prisma } from "../config/prismaClient";
import { ProductTypes } from "../types";
import { builderFunc } from "../utils";
import { productsSeed } from "../../prisma/data";
import { db } from "../db";
import { productsTable } from "../db/schema/products";
import { badgesToProducts } from "../db/schema/badgesToProducts";
import { eq, getTableColumns, sql } from "drizzle-orm";
import products from "../routes/productRoutes";
import { badgesTable } from "../db/schema/badges";

export const getProducts = async (c: Context) => {
  const query: ProductTypes.ProductQueryStringType = c.req.query();
  const pagination = builderFunc.paginationBuilder(query);

  const products = await prisma.product.findMany({
    skip: pagination.skip,
    take: pagination.limit,
    include: { badges: true },
  });

  const allProductsCount = await prisma.product.count();

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

  const product = await prisma.product.findFirst({
    where: { slug: slug },
    include: { badges: true },
  });

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

  const product = await prisma.product.update({
    where: {
      id: +id,
    },
    data: {
      ...body,
      badges: {
        set: body.badges?.map((badgeId: number) => ({ id: Number(badgeId) })),
      },
    },
    include: {
      badges: true,
    },
  });

  return c.json({
    success: true,
    data: product,
    message: "Product updated successfully.",
  });
};

export const deleteProduct = async (c: Context) => {
  const { id } = c.req.param();

  await prisma.product.delete({ where: { id: +id } });

  return c.json({
    success: true,
    message: "Product deleted successfully.",
  });
};

export const seedProductsData = async (c: Context) => {
  await prisma.product.deleteMany();

  await prisma.product.createMany({ data: productsSeed });

  return c.json({
    success: true,
  });
};
