import { Context } from "hono";
import { db } from "../db";
import { categoriesTable } from "../db/schema/categories";
import { eq, and, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { buildCategoryTree } from "../utils/builCategoryTree";
import { Category, CategoryWithRelations } from "../types";

export const getCategories = async (c: Context) => {
  const categories = await db.query.categoriesTable.findMany();

  return c.json({
    success: true,
    data: categories,
    message: "Categories retrieved successfully",
  });
};

// Get categories by id
export const getCategoriesById = async (c: Context) => {
  const { id } = c.req.param();
  const numId = parseInt(id);

  const category = await db.query.categoriesTable.findFirst({
    where: eq(categoriesTable.id, numId),
  });

  return c.json({
    success: true,
    data: category,
    message: `id ${numId} categories retrieved successfully`,
  });
};

export const getCategoryBySlug = async (c: Context) => {
  const { slug } = c.req.param();

  const category = await db.query.categoriesTable.findFirst({
    where: eq(categoriesTable.slug, slug),
  });

  if (!category) {
    throw new HTTPException(404, {
      message: "Category not found.",
    });
  }

  return c.json({
    success: true,
    data: category,
    message: "Category retrieved successfully",
  });
};

// Create parent category (level 1)
export const createParentCategory = async (c: Context) => {
  const body = await c.req.json();

  const newCategory = await db
    .insert(categoriesTable)
    .values({
      name: body.name,
      slug: body.slug,
      description: body.description,
      isParent: true,
      level: 1,
      parentImage: body.parentImage,
      parentBanner: body.parentBanner,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return c.json({
    success: true,
    data: newCategory[0],
    message: "Parent category created successfully",
  });
};

// Create child category (level 2)
export const createChildCategory = async (c: Context) => {
  const body = await c.req.json();

  // Validate that parent exists and is a parent category
  const parentCategory = await db
    .select()
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.id, body.parentId),
        eq(categoriesTable.level, 1),
        eq(categoriesTable.isParent, true)
      )
    )
    .limit(1);

  if (parentCategory.length === 0) {
    throw new HTTPException(400, {
      message: "Parent category not found or invalid parent category.",
    });
  }

  const newCategory = await db
    .insert(categoriesTable)
    .values({
      name: body.name,
      slug: body.slug,
      description: body.description,
      isParent: false,
      level: 2,
      parentId: body.parentId,
      image: body.image,
      color: body.color,
      icon: body.icon,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return c.json({
    success: true,
    data: newCategory[0],
    message: "Child category created successfully",
  });
};

// Create subchild category (level 3)
export const createSubChildCategory = async (c: Context) => {
  const body = await c.req.json();

  // Validate that parent exists and is a child category
  const parentCategory = await db
    .select()
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.id, body.parentId),
        eq(categoriesTable.level, 2),
        eq(categoriesTable.isParent, false)
      )
    )
    .limit(1);

  if (parentCategory.length === 0) {
    throw new HTTPException(400, {
      message: "Parent category not found or invalid parent category.",
    });
  }

  const newCategory = await db
    .insert(categoriesTable)
    .values({
      name: body.name,
      slug: body.slug,
      description: body.description,
      isParent: false,
      level: 3,
      parentId: body.parentId,
      image: body.image,
      color: body.color,
      icon: body.icon,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return c.json({
    success: true,
    data: newCategory[0],
    message: "Subchild category created successfully",
  });
};

// Legacy function for backward compatibility
export const createCategory = async (c: Context) => {
  const body = await c.req.json();

  const newCategory = await db
    .insert(categoriesTable)
    .values({
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, "-"),
      image: body.image,
      isParent: false,
      level: 1,
      isActive: true,
      sortOrder: 0,
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

// Delete all categories
export const deleteAllCategories = async (c: Context) => {
  const result = await db.delete(categoriesTable);

  return c.json({
    success: true,
    message: `All categories deleted successfully. ${result.rowCount} categories were removed.`,
    deletedCount: result.rowCount,
  });
};

export const updateCategory = async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const existing = await db.query.categoriesTable.findFirst({
    where: eq(categoriesTable.id, +id),
  });

  if (!existing) {
    throw new HTTPException(404, {
      message: "Category not found.",
    });
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.slug !== undefined) updateData.slug = body.slug;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

  if (existing.level === 1) {
    if (body.parentImage !== undefined) updateData.parentImage = body.parentImage;
    if (body.parentBanner !== undefined)
      updateData.parentBanner = body.parentBanner;
  } else {
    if (body.image !== undefined) updateData.image = body.image;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.parentId !== undefined) updateData.parentId = body.parentId;
  }

  const [category] = await db
    .update(categoriesTable)
    .set(updateData)
    .where(eq(categoriesTable.id, +id))
    .returning();

  return c.json({
    success: true,
    data: category,
    message: "Category updated successfully.",
  });
};

// Get categories by level
export const getCategoriesByLevel = async (c: Context) => {
  const { level } = c.req.param();
  const levelNum = parseInt(level);

  if (![1, 2, 3].includes(levelNum)) {
    throw new HTTPException(400, {
      message: "Invalid level. Must be 1, 2, or 3.",
    });
  }

  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.level, levelNum));

  return c.json({
    success: true,
    data: categories,
    message: `Level ${levelNum} categories retrieved successfully`,
  });
};

// Get category full path (category → parent → grandparent) with children
export const getCategoryFullPath = async (c: Context) => {
  try {
    const { id } = c.req.param();
    const categoryId = +id;

    if (isNaN(categoryId)) {
      throw new HTTPException(400, {
        message: "Invalid category ID.",
      });
    }

    const category = (await db.query.categoriesTable.findFirst({
      where: eq(categoriesTable.id, categoryId),
      with: {
        parent: {
          with: {
            parent: {
              with: {
                parent: true,
              },
            },
          },
        },
      },
    })) as CategoryWithRelations | undefined;

    if (!category) {
      throw new HTTPException(404, {
        message: "Category not found.",
      });
    }

    const allDescendants = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.parentId, categoryId))
      .then(async (directChildren) => {
        if (directChildren.length === 0) return [];

        const allCategories: Category[] = [...directChildren];
        let currentLevel = directChildren.map((c) => c.id);

        while (currentLevel.length > 0) {
          const nextLevel = await db
            .select()
            .from(categoriesTable)
            .where(inArray(categoriesTable.parentId, currentLevel));

          if (nextLevel.length === 0) break;

          allCategories.push(...nextLevel);
          currentLevel = nextLevel.map((c) => c.id);
        }

        return allCategories;
      });

    const children = buildCategoryTree(allDescendants, categoryId);

    const response = {
      ...category,
      children,
    };

    return c.json({
      success: true,
      data: response,
      message: "Category full path retrieved successfully",
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    console.error("Error in getCategoryFullPath:", error);
    throw new HTTPException(500, {
      message: "Internal server error while retrieving category.",
    });
  }
};
