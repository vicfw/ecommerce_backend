import { desc } from "drizzle-orm";
import { Context } from "hono";
import { db } from "../db";
import { deliveryCostsTable } from "../db/schema/deliveryCosts";

export const createDeliveryCost = async (c: Context) => {
  const { cost } = await c.req.json();

  const [created] = await db
    .insert(deliveryCostsTable)
    .values({
      cost,
    })
    .returning();

  return c.json({
    success: true,
    data: created,
    message: "deliveryCost created successfully",
  });
};

export const getDeliveryCost = async (c: Context) => {
  const [deliveryCost] = await db
    .select()
    .from(deliveryCostsTable)
    .orderBy(desc(deliveryCostsTable.createdAt))
    .limit(1);

  return c.json({
    success: true,
    data: deliveryCost,
    message: "deliveryCost retrieved successfully",
  });
};

export const getAllDeliveryCosts = async (c: Context) => {
  const deliveryCosts = await db
    .select()
    .from(deliveryCostsTable)
    .orderBy(desc(deliveryCostsTable.createdAt));

  return c.json({
    success: true,
    data: deliveryCosts,
    message: "Delivery costs retrieved successfully",
  });
};
