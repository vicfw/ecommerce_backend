import { and, count, eq, SQL } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { commentsTable } from "../db/schema/comments";
import { productsTable } from "../db/schema/products";
import { usersTable } from "../db/schema/users";
import { CommentType } from "../validation/validation";
import {
  paginatedResponseBuilder,
  paginationBuilder,
} from "../utils/builder/builderFunc";

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

  conditions.push(eq(commentsTable.isApproved, true));

  const pagination = paginationBuilder(url);

  const query = db
    .select({
      // Select comment fields
      id: commentsTable.id,
      productId: commentsTable.productId,
      body: commentsTable.body,
      image: commentsTable.image,
      // Select user fields
      user: {
        id: usersTable.id,
        name: usersTable.name,
        lastName: usersTable.lastName,
        image: usersTable.lastName,
      },
      createdAt: commentsTable.createdAt,
      updatedAt: commentsTable.updatedAt,
    })
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(commentsTable.productId, productsTable.id));

  if (pagination.skip) {
    query.offset(pagination.skip);
  }

  if (pagination.limit) {
    query.limit(pagination.limit);
  }

  // Apply conditions if any exist
  const finalQuery =
    conditions.length > 0 ? query.where(and(...conditions)) : query;

  // Execute the query
  const comments = await finalQuery;
  const [total] = await db
    .select({ count: count() })
    .from(commentsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const hasMore = pagination.page * pagination.limit < total.count;

  return c.json(
    paginatedResponseBuilder(
      comments,
      "Comments retrieved successfully",
      total.count,
      pagination.page,
      hasMore,
      true
    )
  );
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
      isApproved: true,
    })
    .returning();

  return c.json({
    success: true,
    data: newComment,
    message: "Comment created successfully",
  });
};

export const deleteComment = async (c: Context) => {
  const { id } = c.req.param();

  const comment = await db
    .delete(commentsTable)
    .where(eq(commentsTable.id, +id));

  if (comment.rowCount === 0) {
    throw new HTTPException(404, {
      message: "Comment not found.",
    });
  }

  return c.json({
    success: true,
    message: "Comment deleted successfully.",
  });
};

export const updateComment = async (c: Context) => {
  const { id } = c.req.param();
  const body: Partial<CommentType> = await c.req.json();

  const [comment] = await db
    .update(commentsTable)
    .set({ isApproved: body.isApproved, image: body.image })
    .where(eq(commentsTable.id, +id))
    .returning();

  if (!comment) {
    throw new HTTPException(404, {
      message: "Comment not found.",
    });
  }

  return c.json({
    success: true,
    data: comment,
    message: "Comment updated successfully.",
  });
};
