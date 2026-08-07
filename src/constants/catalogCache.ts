/**
 * Catalog cache contract — keep values identical to
 * ecommerce_frontend/lib/catalogCache.ts
 */
export const CATALOG_TTL_SECONDS = 60;

export const catalogTags = {
  products: "products",
  categories: "categories",
  brands: "brands",
  homepage: "homepage",
  product: (slug: string) => `product:${slug}`,
} as const;

export const CATALOG_VERSION_KEYS = {
  products: "catalog:products:ver",
  categories: "catalog:categories:ver",
  brands: "catalog:brands:ver",
} as const;
