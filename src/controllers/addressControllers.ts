import { Context } from "hono";
import { prisma } from "../config/prismaClient";

export const getAddress = async (c: Context) => {
  const user = c.get("user");

  const address = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [
      {
        userId: "asc",
      },
      { id: "asc" },
    ],
  });

  return c.json({
    success: true,
    data: address,
    message: "Address retrieved successfully",
  });
};

export const createAddress = async (c: Context) => {
  const body = await c.req.json();
  const user = c.get("user");

  const addresses = await prisma.address.count({
    where: { userId: user.id },
  });

  const isDefault = addresses === 0;

  const address = await prisma.address.create({
    data: { userId: user.id, ...body, isDefault },
  });

  return c.json({
    success: true,
    data: address,
    message: "Address created successfully",
  });
};
export const updateAddress = async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  if (body.isDefault) {
    await prisma.address.updateMany({
      where: {
        userId: body.userId,
        isDefault: true,
        id: {
          not: +id,
        },
      },
      data: {
        isDefault: false,
      },
    });
  }

  const updatedAddress = await prisma.address.update({
    where: {
      id: +id,
    },
    data: {
      ...body,
    },
  });

  return c.json({
    success: true,
    data: updatedAddress,
    message: "Address updated successfully",
  });
};
