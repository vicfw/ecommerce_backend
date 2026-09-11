import { describe, expect, it } from "bun:test";
import { normalizePersianText } from "./normalizePersianText";
import { toProductDocument, type ProductIndexSource } from "./productDocument";

const baseSource = (): ProductIndexSource => ({
  id: 1,
  prName: "غذاي گربه",
  enName: "Cat Food",
  description: "گُربه ـ پرشين",
  price: 120000,
  categoryId: 4,
  brandId: 2,
  createdAt: new Date("2024-01-02T00:00:00.000Z"),
  categoryName: "كنسرو گربه",
  categorySlug: "cat-food",
  brandName: "رويال کنين",
  brandSlug: "royal-canin",
  colors: ["قرمز", "قرمز", "كرم"],
  badgeIds: [3, 3, 7],
});

describe("toProductDocument", () => {
  it("normalizes searchable fields with the same rules as queries", () => {
    const variants = ["غذای‌  گربه", "غذای گربه", "غذاي گربه"];
    const indexed = variants.map(
      (prName) => toProductDocument({ ...baseSource(), prName }).prName
    );
    const queried = variants.map((value) => normalizePersianText(value));

    expect(indexed).toEqual(queried);
    expect(new Set(indexed).size).toBe(1);
  });

  it("normalizes brand, category, description, and color names", () => {
    const doc = toProductDocument(baseSource());

    expect(doc.prName).toBe(normalizePersianText("غذای گربه"));
    expect(doc.brandName).toBe(normalizePersianText("رویال کنین"));
    expect(doc.categoryName).toBe(normalizePersianText("کنسرو گربه"));
    expect(doc.description).toBe(normalizePersianText("گربه پرشین"));
    expect(doc.colors).toEqual([
      normalizePersianText("قرمز"),
      normalizePersianText("کرم"),
    ]);
  });

  it("leaves slugs, ids, and price unnormalized", () => {
    const doc = toProductDocument(baseSource());

    expect(doc.id).toBe(1);
    expect(doc.categoryId).toBe(4);
    expect(doc.categorySlug).toBe("cat-food");
    expect(doc.brandId).toBe(2);
    expect(doc.brandSlug).toBe("royal-canin");
    expect(doc.price).toBe(120000);
    expect(doc.badgeIds).toEqual([3, 7]);
    expect(doc.createdAt).toBe(Date.parse("2024-01-02T00:00:00.000Z"));
  });
});
