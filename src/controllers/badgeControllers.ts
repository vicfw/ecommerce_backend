import { Context } from "hono";
import { db } from "../db";
import { badgesTable } from "../db/schema/badges";

export const getBadges = async (c: Context) => {};

export const createBadge = async (c: Context) => {
  const { title, icon } = await c.req.json();

  const badge = await db
    .insert(badgesTable)
    .values({ title, icon })
    .returning();

  return c.json({
    success: true,
    data: {
      badge,
    },
    message: "Badge created successfully",
  });
};

export const updateBadge = async (c: Context) => {};

export const deleteBadge = async (c: Context) => {};
