import { describe, expect, it } from "bun:test";
import { normalizePersianText } from "./normalizePersianText";

describe("normalizePersianText", () => {
  it("returns empty string for nullish, empty, and whitespace-only input", () => {
    expect(normalizePersianText("")).toBe("");
    expect(normalizePersianText("   ")).toBe("");
    expect(normalizePersianText("\n\t")).toBe("");
    expect(normalizePersianText(null)).toBe("");
    expect(normalizePersianText(undefined)).toBe("");
  });

  it("maps Arabic yeh variants to Persian yeh", () => {
    expect(normalizePersianText("ي")).toBe("ی");
    expect(normalizePersianText("ى")).toBe("ی");
    expect(normalizePersianText("ی")).toBe("ی");
  });

  it("maps Arabic kaf to Persian kaf", () => {
    expect(normalizePersianText("ك")).toBe("ک");
    expect(normalizePersianText("ک")).toBe("ک");
  });

  it("leaves hamza yeh unchanged", () => {
    expect(normalizePersianText("ئ")).toBe("ئ");
    expect(normalizePersianText("مسائل")).toBe("مسائل");
  });

  it("normalizes Persian, Arabic, and mixed strings", () => {
    expect(normalizePersianText("غذای گربه")).toBe("غذای گربه");
    expect(normalizePersianText("Royal کنین")).toBe("Royal کنین");
    expect(normalizePersianText("غذاي گربه Royal")).toBe("غذای گربه Royal");
  });

  it("collapses spaces, tabs, and newlines, then trims", () => {
    expect(normalizePersianText("  غذای   گربه  ")).toBe("غذای گربه");
    expect(normalizePersianText("غذای\t\tگربه")).toBe("غذای گربه");
    expect(normalizePersianText("غذای\nگربه")).toBe("غذای گربه");
  });

  it("treats ZWNJ as removable so spaced forms match", () => {
    const withZwnj = "غذای‌  گربه";
    const spaced = "غذای گربه";
    const arabicYeh = "غذاي گربه";

    expect(normalizePersianText(withZwnj)).toBe(normalizePersianText(spaced));
    expect(normalizePersianText(arabicYeh)).toBe(normalizePersianText(spaced));
    expect(normalizePersianText("کنسرو‌ گربه")).toBe(
      normalizePersianText("کنسرو گربه")
    );
  });

  it("strips Arabic diacritics", () => {
    expect(normalizePersianText("گُربه")).toBe("گربه");
  });

  it("strips tatweel", () => {
    expect(normalizePersianText("گـربـه")).toBe("گربه");
  });

  it("matches common ecommerce yeh/kaf variants", () => {
    expect(normalizePersianText("غذاي گربه")).toBe(
      normalizePersianText("غذای گربه")
    );
    expect(normalizePersianText("گربه پرشين")).toBe(
      normalizePersianText("گربه پرشین")
    );
    expect(normalizePersianText("رويال کنين")).toBe(
      normalizePersianText("رویال کنین")
    );
  });

  it("is idempotent", () => {
    const value = "غذاي‌  گُربه ـ پرشين";
    const once = normalizePersianText(value);
    expect(normalizePersianText(once)).toBe(once);
  });

  it("does not fold alef variants", () => {
    expect(normalizePersianText("آ")).toBe("آ");
    expect(normalizePersianText("أ")).toBe("أ");
    expect(normalizePersianText("إ")).toBe("إ");
  });
});
