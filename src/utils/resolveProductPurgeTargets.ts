import { inArray } from "drizzle-orm";
import { db } from "../db";
import { brandsTable } from "../db/schema/brands";
import { categoriesTable } from "../db/schema/categories";
import { purgeAfterProductWrite } from "./purgeCatalog";

const uniqueIds = (ids: (number | null | undefined)[]) => [
  ...new Set(ids.filter((id): id is number => id != null)),
];

const uniqueSlugs = (slugs: (string | null | undefined)[]) => [
  ...new Set(slugs.filter((slug): slug is string => Boolean(slug))),
];

/**
 * Walk category parentId chains leaf → root (one categories query)
 * so every PLP that can list the product is path-revalidated.
 */
async function resolveCategoryAncestorSlugs(
  categoryIds: number[]
): Promise<string[]> {
  if (categoryIds.length === 0) return [];

  const allCategories = await db
    .select({
      id: categoriesTable.id,
      parentId: categoriesTable.parentId,
      slug: categoriesTable.slug,
    })
    .from(categoriesTable);

  const byId = new Map(
    allCategories.map((category) => [category.id, category])
  );
  const slugs = new Set<string>();

  for (const startId of categoryIds) {
    const visited = new Set<number>();
    let current = byId.get(startId);

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      slugs.add(current.slug);
      current =
        current.parentId != null ? byId.get(current.parentId) : undefined;
    }
  }

  return [...slugs];
}

async function resolveBrandSlugs(brandIds: number[]): Promise<string[]> {
  if (brandIds.length === 0) return [];

  const brands = await db
    .select({ slug: brandsTable.slug })
    .from(brandsTable)
    .where(inArray(brandsTable.id, brandIds));

  return uniqueSlugs(brands.map((brand) => brand.slug));
}

async function resolveProductPurgeTargets(opts: {
  categoryIds?: (number | null | undefined)[];
  brandIds?: (number | null | undefined)[];
}): Promise<{ categorySlugs: string[]; brandSlugs: string[] }> {
  const categoryIds = uniqueIds(opts.categoryIds ?? []);
  const brandIds = uniqueIds(opts.brandIds ?? []);

  const [categorySlugs, brandSlugs] = await Promise.all([
    resolveCategoryAncestorSlugs(categoryIds),
    resolveBrandSlugs(brandIds),
  ]);

  return { categorySlugs, brandSlugs };
}

/** Resolve listing routes then purge Redis + storefront ISR. */
export async function purgeProductWrite(opts: {
  slugs: (string | null | undefined)[];
  categoryIds?: (number | null | undefined)[];
  brandIds?: (number | null | undefined)[];
}): Promise<void> {
  const { categorySlugs, brandSlugs } = await resolveProductPurgeTargets({
    categoryIds: opts.categoryIds,
    brandIds: opts.brandIds,
  });

  await purgeAfterProductWrite({
    slugs: uniqueSlugs(opts.slugs),
    categorySlugs,
    brandSlugs,
  });
}
