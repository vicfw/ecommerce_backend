import { Context } from "hono";
import { prisma } from "../config/prismaClient";
import { ProductTypes } from "../types";
import { builderFunc } from "../utils";

export const getProducts = async (c: Context) => {
  const query: ProductTypes.ProductQueryStringType = c.req.query();
  const pagination = builderFunc.paginationBuilder(query);

  const products = await prisma.product.findMany({
    skip: pagination.skip,
    take: pagination.limit,
    include: { colors: true, category: true },
  });

  return c.json({
    success: true,
    products,
    message: "Products retrieved successfully.",
  });
};

export const createProduct = async (c: Context) => {
  const { name, price, categoryId, images, colors, description } =
    await c.req.json();

  const product = await prisma.product.create({
    data: {
      name,
      description,
      price,
      categoryId,
      images,
      colors: {
        connect: colors.map((colorId: number) => ({ id: Number(colorId) })),
      },
    },
    include: {
      category: true,
      colors: true,
    },
  });

  return c.json({
    success: true,
    product,
    message: "Product created successfully.",
  });
};

export const updateProduct = (c: Context) => {
  return c.json({
    success: true,

    message: "Product updated successfully.",
  });
};

export const deleteProduct = (c: Context) => {
  return c.json({
    success: true,

    message: "Product updated successfully.",
  });
};
