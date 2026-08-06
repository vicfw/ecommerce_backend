import { inArray } from "drizzle-orm";
import { db } from "../db";
import { brandsTable } from "../db/schema/brands";
import { categoriesTable } from "../db/schema/categories";

const unique = (values: (string | null | undefined)[]) => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
];

/**
 * Walk category parentId chain leaf → root so every PLP that can list
 * the product (via descendant matching) is path-revalidated.
 */
export async function getCategoryAncestorSlugs(
  categoryId: number | null | undefined
): Promise<string[]> {
  if (categoryId == null) return [];

  const allCategories = await db
    .select({
      id: categoriesTable.id,
      parentId: categoriesTable.parentId,
      slug: categoriesTable.slug,
    })
    .from(categoriesTable);

  const byId = new Map(allCategories.map((category) => [category.id, category]));
  const slugs: string[] = [];
  let current = byId.get(categoryId);

  while (current) {
    slugs.push(current.slug);
    current =
      current.parentId != null ? byId.get(current.parentId) : undefined;
  }

  return slugs;
}

export async function getCategoryAncestorSlugsForIds(
  categoryIds: (number | null | undefined)[]
): Promise<string[]> {
  const ids = [...new Set(categoryIds.filter((id): id is number => id != null))];
  if (ids.length === 0) return [];

  const nested = await Promise.all(ids.map((id) => getCategoryAncestorSlugs(id)));
  return unique(nested.flat());
}

export async function getBrandSlugs(
  brandIds: (number | null | undefined)[]
): Promise<string[]> {
  const ids = [...new Set(brandIds.filter((id): id is number => id != null))];
  if (ids.length === 0) return [];

  const brands = await db
    .select({ slug: brandsTable.slug })
    .from(brandsTable)
    .where(inArray(brandsTable.id, ids));

  return unique(brands.map((brand) => brand.slug));
}

export async function resolveProductPurgeTargets(opts: {
  categoryIds?: (number | null | undefined)[];
  brandIds?: (number | null | undefined)[];
}): Promise<{ categorySlugs: string[]; brandSlugs: string[] }> {
  const [categorySlugs, brandSlugs] = await Promise.all([
    getCategoryAncestorSlugsForIds(opts.categoryIds ?? []),
    getBrandSlugs(opts.brandIds ?? []),
  ]);

  return { categorySlugs, brandSlugs };
}
