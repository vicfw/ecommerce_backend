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
    include: { colors: true, category: true, badges: true },
  });

  const allProductsCount = await prisma.product.count();

  return c.json({
    success: true,
    products,
    page: query.page ? +query.page : 1,
    total: allProductsCount,
    message: "Products retrieved successfully.",
  });
};

export const getProduct = async (c: Context) => {
  const { id } = c.req.param();

  const products = await prisma.product.findFirst({
    where: { id: +id },
    include: { colors: true, category: true, badges: true },
  });

  return c.json({
    success: true,
    products,
    message: "Product retrieved successfully.",
  });
};

export const createProduct = async (c: Context) => {
  const { name, price, categoryId, images, colors, description, quantity } =
    await c.req.json();

  const product = await prisma.product.create({
    data: {
      name,
      description,
      price,
      categoryId,
      quantity,
      images,
      colors: {
        connect: colors.map((colorId: number) => ({ id: Number(colorId) })),
      },
    },
    include: {
      category: true,
      colors: true,
      badges: true,
    },
  });

  return c.json({
    success: true,
    product,
    message: "Product created successfully.",
  });
};

export const updateProduct = async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const product = await prisma.product.update({
    where: {
      id: +id,
    },
    data: {
      ...body,
      colors: {
        set: body.colors?.map((colorId: number) => ({ id: Number(colorId) })),
      },
      badges: {
        set: body.badges?.map((badgeId: number) => ({ id: Number(badgeId) })),
      },
    },
    include: {
      category: true,
      badges: true,
      colors: true,
    },
  });

  return c.json({
    success: true,
    product,
    message: "Product updated successfully.",
  });
};

export const deleteProduct = async (c: Context) => {
  const { id } = c.req.param();

  await prisma.product.delete({ where: { id: +id } });

  return c.json({
    success: true,
    message: "Product deleted successfully.",
  });
};
