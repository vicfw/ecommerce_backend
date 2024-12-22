import { desc } from "drizzle-orm";
import { Context } from "hono";
import { db } from "../db";
import { deliveryCostsTable } from "../db/schema/deliveryCosts";

export const createDeliveryCost = async (c: Context) => {
  const { cost } = await c.req.json();

  const deliveryCost = await db
    .insert(deliveryCostsTable)
    .values({
      cost,
    })
    .returning();

  return c.json({
    success: true,
    data: deliveryCost,
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
