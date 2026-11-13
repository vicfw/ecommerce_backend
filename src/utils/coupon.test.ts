import { describe, expect, it } from "bun:test";
import {
  computeCouponAmount,
  couponRejectReason,
  normalizeCouponCode,
  shouldReleaseCouponUse,
} from "./coupon";

describe("normalizeCouponCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeCouponCode("  save10 ")).toBe("SAVE10");
  });
});

describe("computeCouponAmount", () => {
  it("caps fixed and percent to the cart subtotal", () => {
    expect(computeCouponAmount({ type: "fixed", value: 20_000 }, 50_000)).toBe(
      20_000
    );
    expect(computeCouponAmount({ type: "fixed", value: 80_000 }, 50_000)).toBe(
      50_000
    );
    expect(computeCouponAmount({ type: "percent", value: 10 }, 50_000)).toBe(
      5_000
    );
  });
});

describe("couponRejectReason", () => {
  const base = {
    id: 1,
    code: "SAVE10",
    type: "fixed",
    value: 10_000,
    minCart: null as number | null,
    expiresAt: null as Date | null,
    active: true,
    maxUses: null as number | null,
    usedCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("rejects expired and under-minimum carts", () => {
    expect(
      couponRejectReason(
        { ...base, expiresAt: new Date("2020-01-01") },
        50_000,
        new Date("2026-01-01")
      )
    ).toBe("کد تخفیف منقضی شده است");

    expect(
      couponRejectReason({ ...base, minCart: 100_000 }, 50_000)
    ).toBe("حداقل مبلغ سبد رعایت نشده است");
  });

  it("rejects missing coupons and exhausted maxUses", () => {
    expect(couponRejectReason(null, 50_000)).toBe("کد تخفیف معتبر نیست");
    expect(
      couponRejectReason({ ...base, maxUses: 1, usedCount: 1 }, 50_000)
    ).toBe("کد تخفیف به پایان رسیده است");
  });
});

describe("shouldReleaseCouponUse", () => {
  it("releases only when a paid order is cancelled or returned", () => {
    expect(shouldReleaseCouponUse("processing", "cancelled")).toBe(true);
    expect(shouldReleaseCouponUse("delivered", "returned")).toBe(true);
    expect(shouldReleaseCouponUse("pending", "cancelled")).toBe(false);
    expect(shouldReleaseCouponUse("processing", "shipped")).toBe(false);
    expect(shouldReleaseCouponUse("cancelled", "returned")).toBe(false);
  });
});
