import { catalogTags } from "../constants/catalogCache";
import {
  invalidateBrands,
  invalidateCategories,
  invalidateProducts,
} from "./catalogCache";
import { revalidateStorefront } from "./revalidateStorefront";

/**
 * Redis invalidate first (awaited), then fire-and-forget storefront revalidate.
 * Never throws — catalog writes must succeed even if purge fails.
 */
export async function purgeAfterProductWrite(opts: {
  slugs: string[];
}): Promise<void> {
  try {
    const slugs = [...new Set(opts.slugs.filter(Boolean))];
    await invalidateProducts(slugs);
    revalidateStorefront({
      tags: [
        catalogTags.products,
        ...slugs.map((slug) => catalogTags.product(slug)),
      ],
      paths: [
        "/",
        "/products",
        ...slugs.map((slug) => `/products/${slug}`),
      ],
    });
  } catch (err) {
    console.error("[catalog-cache] purgeAfterProductWrite failed:", err);
  }
}

export async function purgeAfterCategoryWrite(opts?: {
  slugs?: string[];
}): Promise<void> {
  try {
    const slugs = [...new Set((opts?.slugs ?? []).filter(Boolean))];
    await invalidateCategories();
    revalidateStorefront({
      tags: [catalogTags.categories, catalogTags.products],
      paths: ["/", ...slugs.map((slug) => `/category/${slug}`)],
    });
  } catch (err) {
    console.error("[catalog-cache] purgeAfterCategoryWrite failed:", err);
  }
}

export async function purgeAfterBrandWrite(opts?: {
  slugs?: string[];
}): Promise<void> {
  try {
    const slugs = [...new Set((opts?.slugs ?? []).filter(Boolean))];
    await invalidateBrands();
    revalidateStorefront({
      tags: [catalogTags.brands, catalogTags.products],
      paths: ["/", ...slugs.map((slug) => `/brands/${slug}`)],
    });
  } catch (err) {
    console.error("[catalog-cache] purgeAfterBrandWrite failed:", err);
  }
}
