import { Context } from "hono";
import { count, eq, ilike } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { couponsTable } from "../db/schema/coupons";
import {
  paginationBuilder,
  paginatedResponseBuilder,
} from "../utils/builder/builderFunc";
import { isUniqueViolation } from "../utils/isUniqueViolation";
import { normalizeCouponCode } from "../utils/coupon";

export const getCoupons = async (c: Context) => {
  const search = c.req.query("search") || c.req.query("q");
  const page = c.req.query("page");
  const limit = c.req.query("limit");
  const perPage = c.req.query("perPage");
  const pagination = paginationBuilder({ page, limit, perPage });

  const whereCondition = search
    ? ilike(couponsTable.code, `%${search}%`)
    : undefined;

  const coupons = await db
    .select()
    .from(couponsTable)
    .where(whereCondition)
    .limit(pagination.limit)
    .offset(pagination.skip);

  const [total] = await db
    .select({ count: count() })
    .from(couponsTable)
    .where(whereCondition);

  const hasMore = pagination.page * pagination.limit < total.count;

  return c.json(
    paginatedResponseBuilder(
      coupons,
      "Coupons retrieved successfully",
      total.count,
      pagination.page,
      hasMore,
      true
    )
  );
};

export const getCouponById = async (c: Context) => {
  const { id } = c.req.param();

  if (Number.isNaN(+id)) {
    throw new HTTPException(404, { message: "Coupon not found." });
  }

  const [coupon] = await db
    .select()
    .from(couponsTable)
    .where(eq(couponsTable.id, +id));

  if (!coupon) {
    throw new HTTPException(404, { message: "Coupon not found." });
  }

  return c.json({
    success: true,
    data: coupon,
    message: "Coupon retrieved successfully.",
  });
};

export const createCoupon = async (c: Context) => {
  const body = await c.req.json();
  const code = normalizeCouponCode(String(body.code ?? ""));

  if (!code) {
    throw new HTTPException(400, { message: "Coupon code is required." });
  }

  try {
    const [coupon] = await db
      .insert(couponsTable)
      .values({
        code,
        type: body.type,
        value: body.value,
        minCart: body.minCart ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        active: body.active ?? true,
        maxUses: body.maxUses ?? null,
        usedCount: 0,
      })
      .returning();

    return c.json({
      success: true,
      data: coupon,
      message: "Coupon created successfully",
    });
  } catch (error) {
    if (error instanceof HTTPException || !isUniqueViolation(error)) {
      throw error;
    }
    throw new HTTPException(409, { message: "Coupon code already exists." });
  }
};

export const updateCoupon = async (c: Context) => {
  const { id } = c.req.param();

  if (Number.isNaN(+id)) {
    throw new HTTPException(404, { message: "Coupon not found." });
  }

  const body = await c.req.json();
  const updateData: Record<string, unknown> = {};

  if (body.code !== undefined) {
    updateData.code = normalizeCouponCode(String(body.code));
  }
  if (body.type !== undefined) updateData.type = body.type;
  if (body.value !== undefined) updateData.value = body.value;
  if (body.minCart !== undefined) updateData.minCart = body.minCart;
  if (body.expiresAt !== undefined) {
    updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  }
  if (body.active !== undefined) updateData.active = body.active;
  if (body.maxUses !== undefined) updateData.maxUses = body.maxUses;

  if (Object.keys(updateData).length === 0) {
    throw new HTTPException(400, {
      message: "No fields provided to update.",
    });
  }

  try {
    const [coupon] = await db
      .update(couponsTable)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(couponsTable.id, +id))
      .returning();

    if (!coupon) {
      throw new HTTPException(404, { message: "Coupon not found." });
    }

    return c.json({
      success: true,
      data: coupon,
      message: "Coupon updated successfully.",
    });
  } catch (error) {
    if (error instanceof HTTPException || !isUniqueViolation(error)) {
      throw error;
    }
    throw new HTTPException(409, { message: "Coupon code already exists." });
  }
};

export const deleteCoupon = async (c: Context) => {
  const { id } = c.req.param();

  if (Number.isNaN(+id)) {
    throw new HTTPException(404, { message: "Coupon not found." });
  }

  const result = await db
    .delete(couponsTable)
    .where(eq(couponsTable.id, +id));

  if (result.rowCount === 0) {
    throw new HTTPException(404, { message: "Coupon not found." });
  }

  return c.json({
    success: true,
    message: "Coupon deleted successfully.",
  });
};
