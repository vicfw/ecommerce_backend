import { Context } from "hono";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { brandsTable } from "../db/schema/brands";

export const getBrands = async (c: Context) => {
  const categories = await db.query.brandsTable.findMany();

  return c.json({
    success: true,
    data: categories,
    message: "Categories retrieved successfully",
  });
};

export const createBrand = async (c: Context) => {
  const body = await c.req.json();

  const [newBrand] = await db
    .insert(brandsTable)
    .values({
      name: body.name,
      image: body.image,
    })
    .returning();

  return c.json({
    success: true,
    data: newBrand,
    message: "Brand created successfully",
  });
};

export const deleteBrand = async (c: Context) => {
  const { id } = c.req.param();

  const brand = await db.delete(brandsTable).where(eq(brandsTable.id, +id));

  if (brand.rowCount === 0) {
    throw new HTTPException(404, {
      message: "Brand not found.",
    });
  }

  return c.json({
    success: true,
    message: "Brand deleted successfully.",
  });
};

export const updateBrand = async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const [brand] = await db
    .update(brandsTable)
    .set({ name: body.name, image: body.image })
    .where(eq(brandsTable.id, +id))
    .returning();

  if (!brand) {
    throw new HTTPException(404, {
      message: "Brand not found.",
    });
  }

  return c.json({
    success: true,
    data: brand,
    message: "Brand updated successfully.",
  });
};
