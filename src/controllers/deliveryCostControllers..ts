import { Context } from "hono";
import { prisma } from "../config/prismaClient";

export const createDeliveryCost = async (c: Context) => {
  const { cost } = await c.req.json();

  const deliveryCost = await prisma.deliveryCost.create({ data: { cost } });

  return c.json({
    success: true,
    data: deliveryCost,
    message: "deliveryCost created successfully",
  });
};

export const getDeliveryCost = async (c: Context) => {
  const deliveryCost = await prisma.deliveryCost.findFirst({
    orderBy: {
      createdAt: "desc",
    },
  });

  return c.json({
    success: true,
    data: deliveryCost,
    message: "deliveryCost created successfully",
  });
};
