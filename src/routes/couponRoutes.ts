import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { coupon } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { validation } from "../validation";

const coupons = new Hono();

coupons.get("/", protect, isAdmin, (c) => coupon.getCoupons(c));
coupons.get("/:id", protect, isAdmin, (c) => coupon.getCouponById(c));
coupons.post(
  "/",
  protect,
  isAdmin,
  zValidator("json", validation.couponSchema),
  (c) => coupon.createCoupon(c)
);
coupons.patch(
  "/:id",
  protect,
  isAdmin,
  zValidator("json", validation.partialCouponSchema),
  (c) => coupon.updateCoupon(c)
);
coupons.delete("/:id", protect, isAdmin, (c) => coupon.deleteCoupon(c));

export default coupons;
