import { Context } from "hono";
import { db } from "../db";
import { categoriesTable } from "../db/schema/categories";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

export const getCategories = async (c: Context) => {
  const categories = await db.query.categoriesTable.findMany({
    with: { product: true },
  });

  return c.json({
    success: true,
    data: categories,
    message: "Categories retrieved successfully",
  });
};

export const createCategory = async (c: Context) => {
  const body = await c.req.json();

  const newCategory = await db
    .insert(categoriesTable)
    .values({
      name: body.name,
      image: body.image,
    })
    .returning();

  return c.json({
    success: true,
    data: newCategory[0],
    message: "Category created successfully",
  });
};

export const deleteCategory = async (c: Context) => {
  const { id } = c.req.param();

  const category = await db
    .delete(categoriesTable)
    .where(eq(categoriesTable.id, +id));

  if (category.rowCount === 0) {
    throw new HTTPException(404, {
      message: "Category not found.",
    });
  }

  return c.json({
    success: true,
    message: "Category deleted successfully.",
  });
};

export const updateCategory = async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const [category] = await db
    .update(categoriesTable)
    .set({ name: body.name, image: body.image })
    .where(eq(categoriesTable.id, +id))
    .returning();

  if (!category) {
    throw new HTTPException(404, {
      message: "Category not found.",
    });
  }

  return c.json({
    success: true,
    data: category,
    message: "Category updated successfully.",
  });
};
