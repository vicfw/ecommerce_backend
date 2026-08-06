import { asc, eq, getTableColumns, sql, SQL } from "drizzle-orm";
import { Context } from "hono";
import { db } from "../db";
import { badgesTable } from "../db/schema/badges";
import { badgesToProducts } from "../db/schema/badgesToProducts";
import { colorImagesTable } from "../db/schema/colorImage";
import { productsTable } from "../db/schema/products";
import { builderFunc } from "../utils";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");

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
  const query = c.req.query();
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
    page: pagination.page,
    total: allProductsCount,
    message: "Products retrieved successfully.",
  });
};

export const getProduct = async (c: Context) => {
  const params = c.req.param();
  const slug = params.slug ?? params.id;

  // Admin getOne uses numeric id; storefront uses slug
  const whereClause = /^\d+$/.test(slug)
    ? eq(productsTable.id, +slug)
    : eq(productsTable.slug, slug);

  const [product] = await getProductWithRelations(whereClause);

  if (!product) {
    return c.json(
      {
        success: false,
        message: "Product not found.",
      },
      404
    );
  }

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
    defaultColorImage,
  } = await c.req.json();

  const product = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(productsTable)
      .values({
        prName,
        enName,
        description,
        price,
        quantity,
        slug: slugify(enName),
        images,
        weight: weight ?? 0,
        discount: discount ?? 0,
        defaultColorImage: defaultColorImage || images?.[0] || "",
        categoryId,
        brandId,
      })
      .returning();

    if (badges?.length > 0) {
      await tx.insert(badgesToProducts).values(
        badges.map((badgeId: number) => ({
          badgeId,
          productId: created.id,
        }))
      );
    }

    if (colorImageIds?.length > 0) {
      await Promise.all(
        colorImageIds.map((colorImageId: number) =>
          tx
            .update(colorImagesTable)
            .set({ productId: created.id })
            .where(eq(colorImagesTable.id, colorImageId))
        )
      );
    }

    return created;
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
    return c.json(
      {
        success: false,
        message: "Product not found.",
      },
      404
    );
  }

  const {
    badges,
    colorImageIds,
    prName,
    enName,
    price,
    images,
    description,
    quantity,
    weight,
    discount,
    categoryId,
    brandId,
    defaultColorImage,
  } = body;

  const product = await db.transaction(async (tx) => {
    const updateData: Partial<typeof productsTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (prName !== undefined) updateData.prName = prName;
    if (enName !== undefined) {
      updateData.enName = enName;
      updateData.slug = slugify(enName);
    }
    if (price !== undefined) updateData.price = price;
    if (description !== undefined) updateData.description = description;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (weight !== undefined) updateData.weight = weight;
    if (discount !== undefined) updateData.discount = discount;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (brandId !== undefined) updateData.brandId = brandId;
    if (images !== undefined) {
      updateData.images = images;
      if (defaultColorImage === undefined && images[0]) {
        updateData.defaultColorImage = images[0];
      }
    }
    if (defaultColorImage !== undefined) {
      updateData.defaultColorImage = defaultColorImage;
    }

    const [updated] = await tx
      .update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, +id))
      .returning();

    if (badges !== undefined) {
      await tx
        .delete(badgesToProducts)
        .where(eq(badgesToProducts.productId, +id));

      if (badges.length > 0) {
        await tx.insert(badgesToProducts).values(
          badges.map((badgeId: number) => ({
            badgeId,
            productId: +id,
          }))
        );
      }
    }

    if (colorImageIds !== undefined) {
      await tx
        .update(colorImagesTable)
        .set({ productId: null })
        .where(eq(colorImagesTable.productId, +id));

      if (colorImageIds.length > 0) {
        await Promise.all(
          colorImageIds.map((colorImageId: number) =>
            tx
              .update(colorImagesTable)
              .set({ productId: +id })
              .where(eq(colorImagesTable.id, colorImageId))
          )
        );
      }
    }

    return updated;
  });

  const [result] = await getProductWithRelations(
    eq(productsTable.id, product.id)
  );

  return c.json({
    success: true,
    data: result,
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
      return c.json(
        {
          success: false,
          message: "Product not found.",
        },
        404
      );
    }

    return c.json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return c.json(
      {
        success: false,
        message: "Error occurred while deleting product.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
};
