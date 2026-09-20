import { normalizePersianText } from "./normalizePersianText";

export type ProductIndexSource = {
  id: number;
  prName: string | null;
  enName: string | null;
  description: string | null;
  price: number;
  categoryId: number;
  brandId: number | null;
  createdAt: Date | string | null;
  categoryName: string | null;
  categorySlug: string | null;
  brandName: string | null;
  brandSlug: string | null;
  colors: string[] | null;
  badgeIds: Array<number | string> | null;
};

export type ProductSearchDocument = {
  id: number;
  prName: string;
  enName: string;
  description: string;
  brandName: string;
  categoryName: string;
  categoryId: number;
  categorySlug: string;
  brandId: number | null;
  brandSlug: string;
  price: number;
  colors: string[];
  badgeIds: number[];
  createdAt: number;
};

const uniqueNormalized = (values: string[] | null | undefined) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values ?? []) {
    const normalized = normalizePersianText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
};

const uniqueIds = (values: Array<number | string> | null | undefined) => {
  const seen = new Set<number>();
  const result: number[] = [];

  for (const value of values ?? []) {
    const id = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
};

const toCreatedAt = (value: Date | string | null | undefined) => {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

export function toProductDocument(
  source: ProductIndexSource,
): ProductSearchDocument {
  return {
    id: source.id,
    prName: normalizePersianText(source.prName),
    enName: normalizePersianText(source.enName),
    description: normalizePersianText(source.description),
    brandName: normalizePersianText(source.brandName),
    categoryName: normalizePersianText(source.categoryName),
    categoryId: source.categoryId,
    categorySlug: source.categorySlug ?? "",
    brandId: source.brandId,
    brandSlug: source.brandSlug ?? "",
    price: source.price,
    colors: uniqueNormalized(source.colors),
    badgeIds: uniqueIds(source.badgeIds),
    createdAt: toCreatedAt(source.createdAt),
  };
}
