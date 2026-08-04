import { Context } from "hono";
import { db } from "../db";
import { eq, ilike, count } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { badgesTable } from "../db/schema/badges";
import {
  paginationBuilder,
  paginatedResponseBuilder,
} from "../utils/builder/builderFunc";

export const getBadges = async (c: Context) => {
  const search = c.req.query("search");
  const q = c.req.query("q");
  const page = c.req.query("page");
  const limit = c.req.query("limit");
  const perPage = c.req.query("perPage");

  const pagination = paginationBuilder({ page, limit, perPage });

  let whereCondition = undefined;
  const searchTerm = search || q;
  if (searchTerm) {
    whereCondition = ilike(badgesTable.title, `%${searchTerm}%`);
  }

  const badges = await db
    .select()
    .from(badgesTable)
    .where(whereCondition)
    .limit(pagination.limit)
    .offset(pagination.skip);

  const [total] = await db
    .select({ count: count() })
    .from(badgesTable)
    .where(whereCondition);

  const hasMore = pagination.page * pagination.limit < total.count;

  return c.json(
    paginatedResponseBuilder(
      badges,
      "Badges retrieved successfully",
      total.count,
      pagination.page,
      hasMore,
      true
    )
  );
};

export const getBadgeById = async (c: Context) => {
  const { id } = c.req.param();

  if (Number.isNaN(+id)) {
    throw new HTTPException(404, {
      message: "Badge not found.",
    });
  }

  const [badge] = await db
    .select()
    .from(badgesTable)
    .where(eq(badgesTable.id, +id));

  if (!badge) {
    throw new HTTPException(404, {
      message: "Badge not found.",
    });
  }

  return c.json({
    success: true,
    data: badge,
    message: "Badge retrieved successfully.",
  });
};

export const createBadge = async (c: Context) => {
  const { title, icon } = await c.req.json();

  const [badge] = await db
    .insert(badgesTable)
    .values({ title, icon })
    .returning();

  return c.json({
    success: true,
    data: badge,
    message: "Badge created successfully",
  });
};

export const updateBadge = async (c: Context) => {
  const { id } = c.req.param();

  if (Number.isNaN(+id)) {
    throw new HTTPException(404, {
      message: "Badge not found.",
    });
  }

  const body = await c.req.json();

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.icon !== undefined) updateData.icon = body.icon;

  if (Object.keys(updateData).length === 0) {
    throw new HTTPException(400, {
      message: "No fields provided to update.",
    });
  }

  const [badge] = await db
    .update(badgesTable)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(badgesTable.id, +id))
    .returning();

  if (!badge) {
    throw new HTTPException(404, {
      message: "Badge not found.",
    });
  }

  return c.json({
    success: true,
    data: badge,
    message: "Badge updated successfully.",
  });
};

export const deleteBadge = async (c: Context) => {
  const { id } = c.req.param();

  if (Number.isNaN(+id)) {
    throw new HTTPException(404, {
      message: "Badge not found.",
    });
  }

  const result = await db
    .delete(badgesTable)
    .where(eq(badgesTable.id, +id));

  if (result.rowCount === 0) {
    throw new HTTPException(404, {
      message: "Badge not found.",
    });
  }

  return c.json({
    success: true,
    message: "Badge deleted successfully.",
  });
};
