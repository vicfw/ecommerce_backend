import { Context } from "hono";
import { db } from "../db";
import { and, eq, InferSelectModel, sql, SQL } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { brandsTable } from "../db/schema/brands";
import { commentsTable } from "../db/schema/comments";
import { CommentType } from "../validation/validation";
import { usersTable } from "../db/schema/users";

export const getComments = async (c: Context) => {
  const url = c.req.query();

  // Build conditions array first
  const conditions: SQL<unknown>[] = [];

  if (url.productId) {
    conditions.push(eq(commentsTable.productId, +url.productId));
  }

  if (url.userId) {
    conditions.push(eq(commentsTable.userId, +url.userId));
  }

  // Create the query with conditions and join
  // const query = db
  //   .select({
  //     comment: commentsTable,
  //     user: {
  //       id: usersTable.id,
  //     },
  //   })
  //   .from(commentsTable)
  //   .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id));

  const query = db
    .select({
      // Select comment fields
      id: commentsTable.id,
      productId: commentsTable.productId,
      userId: commentsTable.userId,
      body: commentsTable.body,
      // Select user fields
      user: {
        id: usersTable.id,
        // Add other user fields you need
      },
    })
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id));

  // Apply conditions if any exist
  const finalQuery =
    conditions.length > 0 ? query.where(and(...conditions)) : query;

  // Execute the query
  const comments = await finalQuery;

  return c.json({
    success: true,
    data: comments,
    message: "Comments retrieved successfully",
  });
};
export const createComment = async (c: Context) => {
  const body: CommentType = await c.req.json();

  const [newComment] = await db
    .insert(commentsTable)
    .values({
      userId: body.userId,
      productId: body.productId,
      body: body.body,
      image: body.image,
      rate: body.rate,
    })
    .returning();

  return c.json({
    success: true,
    data: newComment,
    message: "Comment created successfully",
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
