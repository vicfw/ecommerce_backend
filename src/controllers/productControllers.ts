import { asc, eq, getTableColumns, sql, SQL } from "drizzle-orm";
import { Context } from "hono";
import { db } from "../db";
import { badgesTable } from "../db/schema/badges";
import { badgesToProducts } from "../db/schema/badgesToProducts";
import { productsTable } from "../db/schema/products";
import { ProductTypes } from "../types";
import { builderFunc } from "../utils";
import { colorImagesTable } from "../db/schema/colorImage";
import { commentsTable } from "../db/schema/comments";
import { cartItemsTable } from "../db/schema/cartItems";
import { orderItemsTable } from "../db/schema/orderItems";

const getProductWithRelations = (whereClause: SQL<unknown>) => {
  return db
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
      colorImages: sql<string>`
        COALESCE(
          JSON_AGG(
            CASE WHEN ${colorImagesTable.id} IS NOT NULL 
            THEN JSON_BUILD_OBJECT(
              'id', ${colorImagesTable.id},
              'images', ${colorImagesTable.images},
              'colorImage', ${colorImagesTable.colorImage},
              'name', ${colorImagesTable.name}
            )
            ELSE NULL END
          ) FILTER (WHERE ${colorImagesTable.id} IS NOT NULL),
          '[]'
        )
      `.as("colorImages"),
    })
    .from(productsTable)
    .leftJoin(
      badgesToProducts,
      eq(productsTable.id, badgesToProducts.productId)
    )
    .leftJoin(badgesTable, eq(badgesToProducts.badgeId, badgesTable.id))
    .leftJoin(
      colorImagesTable,
      eq(colorImagesTable.productId, productsTable.id)
    )
    .where(whereClause)
    .groupBy(productsTable.id);
};

export const getProducts = async (c: Context) => {
  const query: ProductTypes.ProductQueryStringType = c.req.query();
  const pagination = builderFunc.paginationBuilder(query);

  const products = await getProductWithRelations(
    query.categoryId
      ? eq(productsTable.categoryId, +query.categoryId)
      : sql`1=1`
  )
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

  const [product] = await getProductWithRelations(eq(productsTable.slug, slug));

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
    categoryId,
    brandId,
    colorImageIds,
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
        defaultColorImage: colorImageIds[0],
        categoryId,
        brandId,
      })
      .returning();

    let productBadgesValue = [];

    if (badges?.length > 0) {
      productBadgesValue = badges.map((badgeId: number) => ({
        badgeId,
        productId: product.id,
      }));
      await tx.insert(badgesToProducts).values(productBadgesValue);
    }

    if (colorImageIds?.length > 0) {
      colorImageIds.forEach(async (colorImageId: number) => {
        await tx
          .update(colorImagesTable)
          .set({
            productId: product.id,
          })
          .where(eq(colorImagesTable.id, colorImageId));
      });
    }

    return product;
  });

  const [result] = await getProductWithRelations(
    eq(productsTable.id, product.id)
  );

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

  return c.json({
    success: true,
    data: product,
    message: "Product updated successfully.",
  });
};

export const deleteProduct = async (c: Context) => {
  const { id } = c.req.param();

  try {
    const deletedProduct = await db
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
    console.error("Delete product error:", error);
    return c.json({
      success: false,
      message: "Error occurred while deleting product.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
