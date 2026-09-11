import { eq, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { badgesToProducts } from "../db/schema/badgesToProducts";
import { brandsTable } from "../db/schema/brands";
import { categoriesTable } from "../db/schema/categories";
import { colorImagesTable } from "../db/schema/colorImage";
import { productsTable } from "../db/schema/products";
import { logger } from "../lib/logger";
import { getMeiliClient, isMeiliConfigured } from "./client";
import { normalizePersianText } from "./normalizePersianText";
import {
  toProductDocument,
  type ProductIndexSource,
} from "./productDocument";

export const PRODUCTS_INDEX = "products";
export const MEILI_MAX_HITS = 10_000;
const INDEX_BATCH_SIZE = 500;

const waitForTask = async (
  client: NonNullable<ReturnType<typeof getMeiliClient>>,
  task: { taskUid: number }
) => {
  await client.tasks.waitForTask(task);
};

export type ProductSearchParams = {
  q: string;
  offset: number;
  limit: number;
  sort?: string;
  categoryIds?: number[];
  brandId?: number | null;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  badgeId?: number;
};

export type ProductSearchHits = {
  ids: number[];
  total: number;
};

const quoteFilterValue = (value: string) =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

export const buildProductSearchFilter = (
  params: ProductSearchParams
): string | undefined => {
  const parts: string[] = [];

  if (params.categoryIds?.length) {
    parts.push(`categoryId IN [${params.categoryIds.join(", ")}]`);
  }

  if (params.brandId != null) {
    parts.push(`brandId = ${params.brandId}`);
  }

  if (params.minPrice != null) {
    parts.push(`price >= ${params.minPrice}`);
  }

  if (params.maxPrice != null) {
    parts.push(`price <= ${params.maxPrice}`);
  }

  if (params.color) {
    const color = normalizePersianText(params.color);
    if (color) parts.push(`colors = ${quoteFilterValue(color)}`);
  }

  if (params.badgeId != null) {
    parts.push(`badgeIds = ${params.badgeId}`);
  }

  return parts.length ? parts.join(" AND ") : undefined;
};

const meiliSort = (sort?: string): string[] | undefined => {
  switch (sort) {
    case "price_asc":
      return ["price:asc"];
    case "price_desc":
      return ["price:desc"];
    case "newest":
      return ["createdAt:desc"];
    default:
      return undefined;
  }
};

let ensureIndexPromise: Promise<void> | null = null;

export const ensureProductIndex = async () => {
  const client = getMeiliClient();
  if (!client) return;

  if (!ensureIndexPromise) {
    ensureIndexPromise = (async () => {
      try {
        await client.getIndex(PRODUCTS_INDEX);
      } catch {
        const created = await client.createIndex(PRODUCTS_INDEX, {
          primaryKey: "id",
        });
        await waitForTask(client, created);
      }

      const settingsTask = await client.index(PRODUCTS_INDEX).updateSettings({
        searchableAttributes: [
          "prName",
          "enName",
          "brandName",
          "categoryName",
          "description",
        ],
        displayedAttributes: ["id"],
        filterableAttributes: [
          "categoryId",
          "categorySlug",
          "brandId",
          "brandSlug",
          "price",
          "colors",
          "badgeIds",
        ],
        sortableAttributes: ["price", "createdAt"],
        pagination: { maxTotalHits: MEILI_MAX_HITS },
        typoTolerance: { enabled: true },
      });
      await waitForTask(client, settingsTask);
    })().catch((err) => {
      ensureIndexPromise = null;
      throw err;
    });
  }

  await ensureIndexPromise;
};

export const loadProductsForIndex = (where?: SQL) => {
  return db
    .select({
      id: productsTable.id,
      prName: productsTable.prName,
      enName: productsTable.enName,
      description: productsTable.description,
      price: productsTable.price,
      categoryId: productsTable.categoryId,
      brandId: productsTable.brandId,
      createdAt: productsTable.createdAt,
      categoryName: categoriesTable.name,
      categorySlug: categoriesTable.slug,
      brandName: brandsTable.name,
      brandSlug: brandsTable.slug,
      colors: sql<string[]>`
        COALESCE(
          ARRAY_AGG(DISTINCT ${colorImagesTable.name})
            FILTER (WHERE ${colorImagesTable.name} IS NOT NULL),
          '{}'::text[]
        )
      `.as("colors"),
      badgeIds: sql<number[]>`
        COALESCE(
          ARRAY_AGG(DISTINCT ${badgesToProducts.badgeId})
            FILTER (WHERE ${badgesToProducts.badgeId} IS NOT NULL),
          '{}'::int[]
        )
      `.as("badgeIds"),
    })
    .from(productsTable)
    .leftJoin(
      categoriesTable,
      eq(productsTable.categoryId, categoriesTable.id)
    )
    .leftJoin(brandsTable, eq(productsTable.brandId, brandsTable.id))
    .leftJoin(
      badgesToProducts,
      eq(productsTable.id, badgesToProducts.productId)
    )
    .leftJoin(
      colorImagesTable,
      eq(productsTable.id, colorImagesTable.productId)
    )
    .where(where ?? sql`true`)
    .groupBy(productsTable.id, categoriesTable.id, brandsTable.id);
};

const addDocuments = async (rows: ProductIndexSource[]) => {
  const client = getMeiliClient();
  if (!client || rows.length === 0) return;

  await ensureProductIndex();
  const index = client.index(PRODUCTS_INDEX);
  const documents = rows.map(toProductDocument);

  for (let i = 0; i < documents.length; i += INDEX_BATCH_SIZE) {
    const task = await index.addDocuments(
      documents.slice(i, i + INDEX_BATCH_SIZE)
    );
    await waitForTask(client, task);
  }
};

export const searchProductIds = async (
  params: ProductSearchParams
): Promise<ProductSearchHits | null> => {
  const query = normalizePersianText(params.q);
  if (!query) return { ids: [], total: 0 };
  if (!isMeiliConfigured()) return null;

  const client = getMeiliClient();
  if (!client) return null;

  try {
    await ensureProductIndex();

    const limit = Math.min(Math.max(params.limit, 0), MEILI_MAX_HITS);
    const offset = Math.max(params.offset, 0);
    const filter = buildProductSearchFilter(params);
    const sort = meiliSort(params.sort);

    const result = await client.index(PRODUCTS_INDEX).search<{ id: number }>(
      query,
      {
        offset,
        limit: Math.max(limit, 1),
        ...(filter ? { filter } : {}),
        ...(sort ? { sort } : {}),
        attributesToRetrieve: ["id"],
      }
    );

    const ids = result.hits
      .map((hit) => Number(hit.id))
      .filter((id) => Number.isFinite(id));

    return {
      ids: limit === 0 ? [] : ids,
      total: result.estimatedTotalHits ?? ids.length,
    };
  } catch (err) {
    logger.error({ err }, "meili_search_failed");
    return null;
  }
};

export const upsertProductById = async (id: number) => {
  try {
    if (!isMeiliConfigured()) return;
    const [row] = await loadProductsForIndex(eq(productsTable.id, id));
    if (!row) return;
    await addDocuments([row]);
  } catch (err) {
    logger.error({ err, productId: id }, "meili_upsert_product_failed");
  }
};

export const deleteProductDocument = async (id: number) => {
  try {
    const client = getMeiliClient();
    if (!client) return;
    await ensureProductIndex();
    const task = await client.index(PRODUCTS_INDEX).deleteDocument(id);
    await waitForTask(client, task);
  } catch (err) {
    logger.error({ err, productId: id }, "meili_delete_product_failed");
  }
};

export const reindexProductsByBrandId = async (brandId: number) => {
  try {
    if (!isMeiliConfigured()) return;
    const rows = await loadProductsForIndex(eq(productsTable.brandId, brandId));
    await addDocuments(rows);
  } catch (err) {
    logger.error({ err, brandId }, "meili_reindex_brand_failed");
  }
};

export const reindexProductsByCategoryId = async (categoryId: number) => {
  try {
    if (!isMeiliConfigured()) return;
    const rows = await loadProductsForIndex(
      eq(productsTable.categoryId, categoryId)
    );
    await addDocuments(rows);
  } catch (err) {
    logger.error({ err, categoryId }, "meili_reindex_category_failed");
  }
};

export const reindexAllProducts = async () => {
  if (!isMeiliConfigured()) {
    logger.warn("meili_reindex_skipped_unconfigured");
    return { indexed: 0, skipped: true as const };
  }

  const rows = await loadProductsForIndex();
  await addDocuments(rows);
  logger.info({ indexed: rows.length }, "meili_reindex_completed");
  return { indexed: rows.length, skipped: false as const };
};
