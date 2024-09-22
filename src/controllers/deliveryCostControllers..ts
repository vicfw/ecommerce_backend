import { Context } from "hono";
import { prisma } from "../config/prismaClient";

export const createDeliveryCost = async (c: Context) => {
  const { cost } = await c.req.json();

  const deliveryCost = await prisma.deliveryCost.upsert({
    where: { id: 1 },
    update: { cost },
    create: { cost },
  });

  return c.json({
    success: true,
    data: deliveryCost,
    message: "deliveryCost created successfully",
  });
};
