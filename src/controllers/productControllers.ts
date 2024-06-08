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
    include: { badges: true },
  });

  const allProductsCount = await prisma.product.count();

  return c.json({
    success: true,
    data: products,
    page: query.page ? +query.page : 1,
    total: allProductsCount,
    message: "Products retrieved successfully.",
  });
};

export const getProduct = async (c: Context) => {
  const { slug } = c.req.param();

  const product = await prisma.product.findFirst({
    where: { slug: slug },
    include: { badges: true },
  });

  return c.json({
    success: true,
    data: product,
    message: "Product retrieved successfully.",
  });
};

export const createProduct = async (c: Context) => {
  const {
    prName,
    enName,
    price,
    categoryId,
    images,
    colors,
    description,
    quantity,
    badges,
  } = await c.req.json();

  const include = {
    category: true,
    colors: colors && colors.length > 0,
    badges: badges && badges.length > 0,
  };

  const product = await prisma.product.create({
    data: {
      prName,
      enName,
      description,
      price,
      quantity,
      slug: enName,
      images,
      badges: {
        connect: badges?.map((badgeId: number) => ({ id: Number(badgeId) })),
      },
    },
    include,
  });

  return c.json({
    success: true,
    data: product,
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
      badges: {
        set: body.badges?.map((badgeId: number) => ({ id: Number(badgeId) })),
      },
    },
    include: {
      badges: true,
    },
  });

  return c.json({
    success: true,
    data: product,
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
