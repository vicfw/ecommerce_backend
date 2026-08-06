import { and, asc, desc, eq, exists, getTableColumns, gte, ilike, inArray, lte, max, min, sql, SQL } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { badgesTable } from "../db/schema/badges";
import { badgesToProducts } from "../db/schema/badgesToProducts";
import { brandsTable } from "../db/schema/brands";
import { categoriesTable } from "../db/schema/categories";
import { colorImagesTable } from "../db/schema/colorImage";
import { productsTable } from "../db/schema/products";
import { builderFunc } from "../utils";
import {
  cacheGet,
  cacheGetOrSet,
  cacheSet,
  getProductsVersion,
  hashQuery,
  productFiltersKey,
  productListKey,
  productSlugKey,
} from "../utils/catalogCache";
import { purgeAfterProductWrite } from "../utils/purgeCatalog";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");

const escapeIlikePattern = (value: string) =>
  value.replace(/[\\%_]/g, (char) => `\\${char}`);

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

const getCategoryIdsIncludingDescendants = async (
  categoryId: number
): Promise<number[]> => {
  const allCategories = await db
    .select({
      id: categoriesTable.id,
      parentId: categoriesTable.parentId,
    })
    .from(categoriesTable);

  const ids = new Set<number>([categoryId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const category of allCategories) {
      if (
        category.parentId != null &&
        ids.has(category.parentId) &&
        !ids.has(category.id)
      ) {
        ids.add(category.id);
        changed = true;
      }
    }
  }

  return [...ids];
};

const resolveCategoryIds = async (query: Record<string, string>) => {
  let categoryId: number | undefined;

  if (query.categoryId) {
    const parsed = +query.categoryId;
    if (Number.isNaN(parsed)) return null;
    categoryId = parsed;
  } else if (query.categorySlug) {
    const [category] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, query.categorySlug))
      .limit(1);

    if (!category) {
      throw new HTTPException(404, { message: "Category not found." });
    }
    categoryId = category.id;
  }

  if (categoryId == null) return null;
  return getCategoryIdsIncludingDescendants(categoryId);
};

const resolveBrandId = async (query: Record<string, string>) => {
  if (query.brandId) {
    const parsed = +query.brandId;
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (query.brand) {
    const [brand] = await db
      .select({ id: brandsTable.id })
      .from(brandsTable)
      .where(eq(brandsTable.slug, query.brand))
      .limit(1);

    if (!brand) {
      throw new HTTPException(404, { message: "Brand not found." });
    }
    return brand.id;
  }

  return null;
};

const buildProductFilterConditions = async (
  query: Record<string, string>
): Promise<SQL[]> => {
  const conditions: SQL[] = [];

  const categoryIds = await resolveCategoryIds(query);
  if (categoryIds) {
    conditions.push(inArray(productsTable.categoryId, categoryIds));
  }

  const brandId = await resolveBrandId(query);
  if (brandId != null) {
    conditions.push(eq(productsTable.brandId, brandId));
  }

  if (query.minPrice && !Number.isNaN(+query.minPrice)) {
    conditions.push(gte(productsTable.price, +query.minPrice));
  }

  if (query.maxPrice && !Number.isNaN(+query.maxPrice)) {
    conditions.push(lte(productsTable.price, +query.maxPrice));
  }

  if (query.color) {
    conditions.push(
      exists(
        db
          .select({ id: colorImagesTable.id })
          .from(colorImagesTable)
          .where(
            and(
              eq(colorImagesTable.productId, productsTable.id),
              ilike(colorImagesTable.name, query.color)
            )
          )
      )
    );
  }

  const badgeId = query.badgeId || query.badge;
  if (badgeId && !Number.isNaN(+badgeId)) {
    conditions.push(
      exists(
        db
          .select({ id: badgesToProducts.id })
          .from(badgesToProducts)
          .where(
            and(
              eq(badgesToProducts.productId, productsTable.id),
              eq(badgesToProducts.badgeId, +badgeId)
            )
          )
      )
    );
  }

  const searchTerm = (query.search || query.q)?.trim();
  if (searchTerm) {
    const pattern = `%${escapeIlikePattern(searchTerm)}%`;
    conditions.push(
      sql`(
        ${productsTable.prName} ILIKE ${pattern} ESCAPE '\\'
        OR ${productsTable.enName} ILIKE ${pattern} ESCAPE '\\'
      )`
    );
  }

  return conditions;
};

const getSortOrder = (sort?: string) => {
  switch (sort) {
    case "price_asc":
      return asc(productsTable.price);
    case "price_desc":
      return desc(productsTable.price);
    case "newest":
      return desc(productsTable.createdAt);
    default:
      return asc(productsTable.id);
  }
};

export const getProducts = async (c: Context) => {
  const query = c.req.query();
  const isAdmin = c.req.path.includes("/admin");

  const load = async () => {
    const pagination = builderFunc.paginationBuilder(query);

    const conditions = await buildProductFilterConditions(query);
    const whereClause =
      conditions.length > 0 ? and(...conditions)! : sql`1=1`;

    const products = await getProductWithRelations(whereClause)
      .limit(pagination.limit)
      .offset(pagination.skip)
      .orderBy(getSortOrder(query.sort));

    const allProductsCount =
      conditions.length > 0
        ? await db.$count(productsTable, whereClause)
        : await db.$count(productsTable);

    const hasMore = pagination.page * pagination.limit < allProductsCount;

    return builderFunc.paginatedResponseBuilder(
      products,
      "Products retrieved successfully.",
      allProductsCount,
      pagination.page,
      hasMore,
      true
    );
  };

  if (isAdmin) {
    return c.json(await load());
  }

  const ver = await getProductsVersion();
  const key = productListKey(ver, hashQuery(query));
  return c.json(await cacheGetOrSet(key, load));
};

export const getProductFilters = async (c: Context) => {
  const query = c.req.query();

  const load = async () => {
    const categoryIds = await resolveCategoryIds(query);
    const scopeCondition = categoryIds
      ? inArray(productsTable.categoryId, categoryIds)
      : sql`1=1`;

    const [priceRange] = await db
      .select({
        minPrice: min(productsTable.price),
        maxPrice: max(productsTable.price),
      })
      .from(productsTable)
      .where(scopeCondition);

    const brands = await db
      .selectDistinct({
        id: brandsTable.id,
        name: brandsTable.name,
        engName: brandsTable.engName,
        slug: brandsTable.slug,
      })
      .from(brandsTable)
      .innerJoin(productsTable, eq(productsTable.brandId, brandsTable.id))
      .where(scopeCondition)
      .orderBy(asc(brandsTable.name));

    const badges = await db
      .selectDistinct({
        id: badgesTable.id,
        title: badgesTable.title,
        icon: badgesTable.icon,
      })
      .from(badgesTable)
      .innerJoin(badgesToProducts, eq(badgesToProducts.badgeId, badgesTable.id))
      .innerJoin(productsTable, eq(productsTable.id, badgesToProducts.productId))
      .where(scopeCondition)
      .orderBy(asc(badgesTable.title));

    const colors = await db
      .selectDistinct({
        name: colorImagesTable.name,
        colorImage: colorImagesTable.colorImage,
      })
      .from(colorImagesTable)
      .innerJoin(
        productsTable,
        eq(productsTable.id, colorImagesTable.productId)
      )
      .where(scopeCondition)
      .orderBy(asc(colorImagesTable.name));

    const categories = categoryIds
      ? await db
          .select({
            id: categoriesTable.id,
            name: categoriesTable.name,
            slug: categoriesTable.slug,
            level: categoriesTable.level,
            parentId: categoriesTable.parentId,
          })
          .from(categoriesTable)
          .where(inArray(categoriesTable.id, categoryIds))
          .orderBy(asc(categoriesTable.sortOrder))
      : await db
          .select({
            id: categoriesTable.id,
            name: categoriesTable.name,
            slug: categoriesTable.slug,
            level: categoriesTable.level,
            parentId: categoriesTable.parentId,
          })
          .from(categoriesTable)
          .where(eq(categoriesTable.isActive, true))
          .orderBy(asc(categoriesTable.sortOrder));

    return {
      success: true,
      data: {
        brands,
        badges,
        colors,
        categories,
        priceRange: {
          minPrice: priceRange?.minPrice ?? 0,
          maxPrice: priceRange?.maxPrice ?? 0,
        },
      },
      message: "Product filters retrieved successfully.",
    };
  };

  const ver = await getProductsVersion();
  const key = productFiltersKey(ver, hashQuery(query));
  return c.json(await cacheGetOrSet(key, load));
};

export const getProduct = async (c: Context) => {
  const params = c.req.param();
  const slugOrId = params.slug ?? params.id;
  const isNumericId = /^\d+$/.test(slugOrId);
  const isAdmin = c.req.path.includes("/admin") || isNumericId;

  const whereClause = isNumericId
    ? eq(productsTable.id, +slugOrId)
    : eq(productsTable.slug, slugOrId);

  if (isAdmin) {
    const [product] = await getProductWithRelations(whereClause);
    if (!product) {
      return c.json(
        { success: false, message: "Product not found." },
        404
      );
    }
    return c.json({
      success: true,
      data: product,
      message: "Product retrieved successfully.",
    });
  }

  const key = productSlugKey(slugOrId);
  const cached = await cacheGet<unknown>(key);
  if (cached.hit) {
    return c.json({
      success: true,
      data: cached.value,
      message: "Product retrieved successfully.",
    });
  }

  const [product] = await getProductWithRelations(whereClause);
  if (!product) {
    return c.json({ success: false, message: "Product not found." }, 404);
  }

  await cacheSet(key, product);
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

  await purgeAfterProductWrite({ slugs: [product.slug] });

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

  await purgeAfterProductWrite({
    slugs: [isExist.slug, product.slug].filter(Boolean),
  });

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

    await purgeAfterProductWrite({
      slugs: [deletedProduct[0].slug].filter(Boolean),
    });

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
