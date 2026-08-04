import { Context } from "hono";
import { db } from "../db";
import { colorImagesTable } from "../db/schema/colorImage";
import { and, count, eq, ilike, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  paginationBuilder,
  paginatedResponseBuilder,
} from "../utils/builder/builderFunc";

export const getColorImages = async (c: Context) => {
  const search = c.req.query("search");
  const page = c.req.query("page");
  const limit = c.req.query("limit");
  const perPage = c.req.query("perPage");
  const productId = c.req.query("productId");
  const unassigned = c.req.query("unassigned");
  const q = c.req.query("q");

  const pagination = paginationBuilder({ page, limit, perPage });

  const conditions = [];

  const searchTerm = search || q;
  if (searchTerm) {
    conditions.push(ilike(colorImagesTable.name, `%${searchTerm}%`));
  }

  // productId takes precedence over unassigned to avoid contradictory filters
  if (productId) {
    conditions.push(eq(colorImagesTable.productId, +productId));
  } else if (unassigned === "true" || unassigned === "1") {
    conditions.push(isNull(colorImagesTable.productId));
  }

  const whereCondition =
    conditions.length > 0 ? and(...conditions) : undefined;

  const colorImages = await db
    .select()
    .from(colorImagesTable)
    .where(whereCondition)
    .limit(pagination.limit)
    .offset(pagination.skip);

  const [total] = await db
    .select({ count: count() })
    .from(colorImagesTable)
    .where(whereCondition);

  const hasMore = pagination.page * pagination.limit < total.count;

  return c.json(
    paginatedResponseBuilder(
      colorImages,
      "Color images retrieved successfully",
      total.count,
      pagination.page,
      hasMore,
      true
    )
  );
};

export const getColorImageById = async (c: Context) => {
  const { id } = c.req.param();

  if (Number.isNaN(+id)) {
    throw new HTTPException(404, {
      message: "Color image not found.",
    });
  }

  const [colorImage] = await db
    .select()
    .from(colorImagesTable)
    .where(eq(colorImagesTable.id, +id));

  if (!colorImage) {
    throw new HTTPException(404, {
      message: "Color image not found.",
    });
  }

  return c.json({
    success: true,
    data: colorImage,
    message: "Color image retrieved successfully.",
  });
};

export const createColorImage = async (c: Context) => {
  const body = await c.req.json();

  const [colorImage] = await db
    .insert(colorImagesTable)
    .values({
      colorImage: body.colorImage,
      images: body.images,
      productId: body.productId ?? null,
      name: body.name,
    })
    .returning();

  return c.json({
    success: true,
    data: colorImage,
    message: "Color image created successfully.",
  });
};

export const updateColorImage = async (c: Context) => {
  const { id } = c.req.param();

  if (Number.isNaN(+id)) {
    throw new HTTPException(404, {
      message: "Color image not found.",
    });
  }

  const body = await c.req.json();

  const updateData: Record<string, unknown> = {};
  if (body.productId !== undefined) updateData.productId = body.productId;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.colorImage !== undefined) updateData.colorImage = body.colorImage;
  if (body.images !== undefined) updateData.images = body.images;

  if (Object.keys(updateData).length === 0) {
    throw new HTTPException(400, {
      message: "No fields provided to update.",
    });
  }

  const [updatedColorImage] = await db
    .update(colorImagesTable)
    .set(updateData)
    .where(eq(colorImagesTable.id, +id))
    .returning();

  if (!updatedColorImage) {
    throw new HTTPException(404, {
      message: "Color image not found.",
    });
  }

  return c.json({
    success: true,
    data: updatedColorImage,
    message: "Color image updated successfully.",
  });
};

export const deleteColorImage = async (c: Context) => {
  const { id } = c.req.param();

  if (Number.isNaN(+id)) {
    throw new HTTPException(404, {
      message: "Color image not found.",
    });
  }

  const result = await db
    .delete(colorImagesTable)
    .where(eq(colorImagesTable.id, +id));

  if (result.rowCount === 0) {
    throw new HTTPException(404, {
      message: "Color image not found.",
    });
  }

  return c.json({
    success: true,
    message: "Color image deleted successfully.",
  });
};
