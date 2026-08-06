import { Context } from "hono";
import { db } from "../db";
import { eq, ilike, count } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { brandsTable } from "../db/schema/brands";
import { productsTable } from "../db/schema/products";
import {
  paginationBuilder,
  paginatedResponseBuilder,
} from "../utils/builder/builderFunc";
import {
  brandProductsKey,
  brandsListKey,
  cacheGetOrSet,
  getBrandsVersion,
  getProductsVersion,
  hashQuery,
} from "../utils/catalogCache";
import { purgeAfterBrandWrite } from "../utils/purgeCatalog";

export const getBrands = async (c: Context) => {
  const search = c.req.query("search");
  const q = c.req.query("q");
  const page = c.req.query("page");
  const limit = c.req.query("limit");
  const perPage = c.req.query("perPage");

  const query = { search, q, page, limit, perPage };
  const ver = await getBrandsVersion();
  const key = brandsListKey(ver, hashQuery(query));

  const payload = await cacheGetOrSet(key, async () => {
    const pagination = paginationBuilder({ page, limit, perPage });

    let whereCondition = undefined;
    const searchTerm = search || q;
    if (searchTerm) {
      whereCondition = ilike(brandsTable.name, `%${searchTerm}%`);
    }

    const brands = await db
      .select()
      .from(brandsTable)
      .where(whereCondition)
      .limit(pagination.limit)
      .offset(pagination.skip);

    const [total] = await db
      .select({ count: count() })
      .from(brandsTable)
      .where(whereCondition);

    const hasMore = pagination.page * pagination.limit < total.count;

    return paginatedResponseBuilder(
      brands,
      "Brands retrieved successfully",
      total.count,
      pagination.page,
      hasMore,
      true
    );
  });

  return c.json(payload);
};

export const getBrandById = async (c: Context) => {
  const { id } = c.req.param();

  if (Number.isNaN(+id)) {
    throw new HTTPException(404, {
      message: "Brand not found.",
    });
  }

  const [brand] = await db
    .select()
    .from(brandsTable)
    .where(eq(brandsTable.id, +id));

  if (!brand) {
    throw new HTTPException(404, {
      message: "Brand not found.",
    });
  }

  return c.json({
    success: true,
    data: brand,
    message: "Brand retrieved successfully.",
  });
};

export const createBrand = async (c: Context) => {
  const body = await c.req.json();

  const [newBrand] = await db
    .insert(brandsTable)
    .values({
      name: body.name,
      engName: body.engName,
      slug: body.slug,
    })
    .returning();

  await purgeAfterBrandWrite({ slugs: [newBrand.slug] });

  return c.json({
    success: true,
    data: newBrand,
    message: "Brand created successfully",
  });
};

export const deleteBrand = async (c: Context) => {
  const { id } = c.req.param();

  const [existing] = await db
    .select()
    .from(brandsTable)
    .where(eq(brandsTable.id, +id))
    .limit(1);

  const brand = await db.delete(brandsTable).where(eq(brandsTable.id, +id));

  if (brand.rowCount === 0) {
    throw new HTTPException(404, {
      message: "Brand not found.",
    });
  }

  await purgeAfterBrandWrite({
    slugs: existing?.slug ? [existing.slug] : [],
  });

  return c.json({
    success: true,
    message: "Brand deleted successfully.",
  });
};

export const updateBrand = async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const [existing] = await db
    .select()
    .from(brandsTable)
    .where(eq(brandsTable.id, +id))
    .limit(1);

  const [brand] = await db
    .update(brandsTable)
    .set({
      name: body.name,
      engName: body.engName,
      slug: body.slug,
    })
    .where(eq(brandsTable.id, +id))
    .returning();

  if (!brand) {
    throw new HTTPException(404, {
      message: "Brand not found.",
    });
  }

  await purgeAfterBrandWrite({
    slugs: [existing?.slug, brand.slug].filter(Boolean) as string[],
  });

  return c.json({
    success: true,
    data: brand,
    message: "Brand updated successfully.",
  });
};

export const getProductsByBrandSlug = async (c: Context) => {
  const { slug } = c.req.param();
  const page = c.req.query("page");
  const limit = c.req.query("limit");

  const productsVer = await getProductsVersion();
  const key = brandProductsKey(
    productsVer,
    slug,
    hashQuery({ page, limit })
  );

  type BrandProductsCache =
    | { notFound: true }
    | {
        notFound: false;
        body: ReturnType<typeof paginatedResponseBuilder>;
      };

  const payload = await cacheGetOrSet<BrandProductsCache>(key, async () => {
    const pagination = paginationBuilder({ page, limit });

    const [brand] = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.slug, slug));

    if (!brand) {
      return { notFound: true };
    }

    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.brandId, brand.id))
      .limit(pagination.limit)
      .offset(pagination.skip);

    const [total] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(eq(productsTable.brandId, brand.id));

    const hasMore = pagination.page * pagination.limit < total.count;

    return {
      notFound: false,
      body: paginatedResponseBuilder(
        { products, brand },
        `Products for brand ${brand.engName} retrieved successfully`,
        total.count,
        pagination.page,
        hasMore,
        true
      ),
    };
  });

  if (payload.notFound) {
    throw new HTTPException(404, {
      message: "Brand not found.",
    });
  }

  return c.json(payload.body);
};
