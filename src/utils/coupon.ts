import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { cartsTable } from "../db/schema/carts";
import { couponsTable } from "../db/schema/coupons";
import type { DbOrTrx } from "./inventory";

export type CouponRow = typeof couponsTable.$inferSelect;

export const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

export const computeCouponAmount = (
  coupon: Pick<CouponRow, "type" | "value">,
  discountPrice: number
) => {
  const subtotal = Math.max(0, discountPrice);
  if (coupon.type === "percent") {
    return Math.min(subtotal, (subtotal * Number(coupon.value)) / 100);
  }
  return Math.min(subtotal, Number(coupon.value) || 0);
};

export const couponRejectReason = (
  coupon: CouponRow | undefined | null,
  discountPrice: number,
  now = new Date()
): string | null => {
  if (!coupon) return "کد تخفیف معتبر نیست";
  if (!coupon.active) return "کد تخفیف معتبر نیست";
  if (coupon.expiresAt && coupon.expiresAt <= now) {
    return "کد تخفیف منقضی شده است";
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return "کد تخفیف به پایان رسیده است";
  }
  if (coupon.minCart != null && discountPrice < coupon.minCart) {
    return "حداقل مبلغ سبد رعایت نشده است";
  }
  return null;
};

/** Recompute or clear cart coupon after discountPrice changes. */
export const syncCartCoupon = async (trx: DbOrTrx, cartId: number) => {
  const [cart] = await trx
    .select()
    .from(cartsTable)
    .where(eq(cartsTable.id, cartId));

  if (!cart?.couponCode) return;

  const [coupon] = await trx
    .select()
    .from(couponsTable)
    .where(eq(couponsTable.code, cart.couponCode));

  const reason = couponRejectReason(coupon, cart.discountPrice || 0);
  if (reason || !coupon) {
    await trx
      .update(cartsTable)
      .set({
        couponCode: null,
        couponAmount: 0,
        updatedAt: new Date(),
      })
      .where(eq(cartsTable.id, cartId));
    return;
  }

  const couponAmount = computeCouponAmount(coupon, cart.discountPrice || 0);
  if (couponAmount !== (cart.couponAmount || 0)) {
    await trx
      .update(cartsTable)
      .set({ couponAmount, updatedAt: new Date() })
      .where(eq(cartsTable.id, cartId));
  }
};

/** Bump usedCount only while under maxUses (null maxUses = unlimited). */
export const incrementCouponUsedCount = (
  trx: DbOrTrx,
  code: string | null | undefined
) => {
  if (!code) return Promise.resolve();

  return trx
    .update(couponsTable)
    .set({
      usedCount: sql`${couponsTable.usedCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(couponsTable.code, code),
        or(
          isNull(couponsTable.maxUses),
          lt(couponsTable.usedCount, couponsTable.maxUses)
        )
      )
    );
};

const PAID_ORDER_STATUSES = new Set(["processing", "shipped", "delivered"]);

/** Paid orders consumed a coupon use; unpaid pending cancels did not. */
export const shouldReleaseCouponUse = (fromStatus: string, toStatus: string) =>
  PAID_ORDER_STATUSES.has(fromStatus) &&
  (toStatus === "cancelled" || toStatus === "returned");

const decrementCouponUsedCount = (
  trx: DbOrTrx,
  code: string | null | undefined
) => {
  if (!code) return Promise.resolve();

  return trx
    .update(couponsTable)
    .set({
      usedCount: sql`GREATEST(${couponsTable.usedCount} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(couponsTable.code, code));
};

export const maybeReleaseCouponUse = (
  trx: DbOrTrx,
  order: { status: string; couponCode?: string | null },
  toStatus: string
) => {
  if (!shouldReleaseCouponUse(order.status, toStatus)) {
    return Promise.resolve();
  }
  return decrementCouponUsedCount(trx, order.couponCode);
};
