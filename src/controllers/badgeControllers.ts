import { Context } from "hono";
import { prisma } from "../config/prismaClient";
import { db } from "../db";
import { badge } from ".";
import { badgesTable } from "../db/schema/badges";

export const getBadges = async (c: Context) => {
  const badges = await prisma.badge.findMany();
  return c.json({
    success: true,
    data: badges,
    message: "Badges retrieved successfully",
  });
};

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

export const updateBadge = async (c: Context) => {
  const { id } = c.req.param();

  const body = await c.req.json();

  const updateBadge = await prisma.badge.update({
    where: { id: +id },
    data: body,
  });

  return c.json({
    success: true,
    message: "Badge updated successfully",
    data: {
      updateBadge,
    },
  });
};

export const deleteBadge = async (c: Context) => {
  const { id } = c.req.param();

  await prisma.badge.delete({ where: { id: +id } });

  return c.json({
    success: true,
    message: "Badge deleted successfully",
  });
};
