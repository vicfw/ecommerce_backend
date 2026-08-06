import { catalogTags } from "../constants/catalogCache";
import {
  invalidateBrands,
  invalidateCategories,
  invalidateProducts,
} from "./catalogCache";
import { revalidateStorefront } from "./revalidateStorefront";

const uniqueSlugs = (slugs: string[] = []) => [
  ...new Set(slugs.filter(Boolean)),
];

/**
 * Redis invalidate first (awaited), then fire-and-forget storefront revalidate.
 * Never throws — catalog writes must succeed even if purge fails.
 */
async function purge(opts: {
  label: string;
  invalidate: () => Promise<void>;
  tags: string[];
  paths: string[];
}): Promise<void> {
  try {
    await opts.invalidate();
    revalidateStorefront({ tags: opts.tags, paths: opts.paths });
  } catch (err) {
    console.error(`[catalog-cache] ${opts.label} failed:`, err);
  }
}

export async function purgeAfterProductWrite(opts: {
  slugs: string[];
  categorySlugs?: string[];
  brandSlugs?: string[];
}): Promise<void> {
  const slugs = uniqueSlugs(opts.slugs);
  const categorySlugs = uniqueSlugs(opts.categorySlugs);
  const brandSlugs = uniqueSlugs(opts.brandSlugs);
  await purge({
    label: "purgeAfterProductWrite",
    invalidate: () => invalidateProducts(slugs),
    tags: [
      catalogTags.products,
      ...slugs.map((slug) => catalogTags.product(slug)),
    ],
    paths: [
      "/",
      "/products",
      ...slugs.map((slug) => `/products/${slug}`),
      ...categorySlugs.map((slug) => `/category/${slug}`),
      ...brandSlugs.map((slug) => `/brands/${slug}`),
    ],
  });
}

export async function purgeAfterCategoryWrite(opts?: {
  slugs?: string[];
}): Promise<void> {
  const slugs = uniqueSlugs(opts?.slugs);
  await purge({
    label: "purgeAfterCategoryWrite",
    invalidate: () => invalidateCategories(),
    tags: [catalogTags.categories, catalogTags.products],
    paths: ["/", ...slugs.map((slug) => `/category/${slug}`)],
  });
}

export async function purgeAfterBrandWrite(opts?: {
  slugs?: string[];
}): Promise<void> {
  const slugs = uniqueSlugs(opts?.slugs);
  await purge({
    label: "purgeAfterBrandWrite",
    invalidate: () => invalidateBrands(),
    tags: [catalogTags.brands, catalogTags.products],
    paths: ["/", ...slugs.map((slug) => `/brands/${slug}`)],
  });
}
