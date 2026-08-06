import { createHash } from "crypto";
import {
  CATALOG_TTL_SECONDS,
  CATALOG_VERSION_KEYS,
} from "../constants/catalogCache";
import { getRedis, withRedis } from "../lib/redis";

export const hashQuery = (query: Record<string, string | undefined>): string => {
  const sorted = Object.keys(query)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      const value = query[key];
      if (value != null && value !== "") {
        acc[key] = value;
      }
      return acc;
    }, {});

  return createHash("sha256")
    .update(JSON.stringify(sorted))
    .digest("hex")
    .slice(0, 16);
};

const getVersion = async (versionKey: string): Promise<string> => {
  const ver = await withRedis((client) => client.get(versionKey));
  return ver ?? "0";
};

export const getProductsVersion = () =>
  getVersion(CATALOG_VERSION_KEYS.products);

export const getCategoriesVersion = () =>
  getVersion(CATALOG_VERSION_KEYS.categories);

export const getBrandsVersion = () => getVersion(CATALOG_VERSION_KEYS.brands);

export const productListKey = (ver: string, queryHash: string) =>
  `catalog:products:list:${ver}:${queryHash}`;

export const productFiltersKey = (ver: string, queryHash: string) =>
  `catalog:products:filters:${ver}:${queryHash}`;

export const productSlugKey = (slug: string) => `catalog:product:slug:${slug}`;

export const categoriesListKey = (ver: string) =>
  `catalog:categories:list:${ver}`;

export const categorySlugKey = (ver: string, slug: string) =>
  `catalog:category:slug:${ver}:${slug}`;

export const categoriesByLevelKey = (ver: string, level: number) =>
  `catalog:categories:level:${ver}:${level}`;

export const brandsListKey = (ver: string, queryHash: string) =>
  `catalog:brands:list:${ver}:${queryHash}`;

export const brandProductsKey = (
  productsVer: string,
  slug: string,
  queryHash: string
) => `catalog:brand:products:${productsVer}:${slug}:${queryHash}`;

export async function cacheGetOrSet<T>(
  key: string,
  loader: () => Promise<T>,
  ttlSeconds: number = CATALOG_TTL_SECONDS
): Promise<T> {
  const cached = await withRedis(async (client) => {
    const value = await client.get(key);
    return value != null ? (JSON.parse(value) as T) : null;
  });

  if (cached != null) {
    return cached;
  }

  const value = await loader();

  await withRedis(async (client) => {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return true;
  });

  return value;
}

const bumpVersion = async (versionKey: string): Promise<void> => {
  await withRedis(async (client) => {
    await client.incr(versionKey);
    return true;
  });
};

export async function invalidateProducts(slugs: string[] = []): Promise<void> {
  await bumpVersion(CATALOG_VERSION_KEYS.products);

  const keys = [...new Set(slugs.filter(Boolean))].map(productSlugKey);
  if (keys.length === 0) return;

  await withRedis(async (client) => {
    await client.del(...keys);
    return true;
  });
}

export async function invalidateCategories(): Promise<void> {
  await bumpVersion(CATALOG_VERSION_KEYS.categories);
  await bumpVersion(CATALOG_VERSION_KEYS.products);
}

export async function invalidateBrands(): Promise<void> {
  await bumpVersion(CATALOG_VERSION_KEYS.brands);
  await bumpVersion(CATALOG_VERSION_KEYS.products);
}

// Re-export getRedis for callers that only need presence checks
export { getRedis };
