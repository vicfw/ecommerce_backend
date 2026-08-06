import { and, count, desc, eq, SQL } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { commentsTable } from "../db/schema/comments";
import { productsTable } from "../db/schema/products";
import { usersTable } from "../db/schema/users";
import {
  paginatedResponseBuilder,
  paginationBuilder,
} from "../utils/builder/builderFunc";

type CommentQueryOptions = {
  productId?: string;
  userId?: string;
  isApproved?: "true" | "false" | true | false;
  requireApproved?: boolean;
  includeModerationFields?: boolean;
};

const parseIsApprovedFilter = (
  value: CommentQueryOptions["isApproved"]
): boolean | undefined => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
};

const fetchComments = async (options: CommentQueryOptions, url: Record<string, string | undefined>) => {
  const conditions: SQL<unknown>[] = [];

  if (options.productId) {
    conditions.push(eq(commentsTable.productId, +options.productId));
  }

  if (options.userId) {
    conditions.push(eq(commentsTable.userId, +options.userId));
  }

  if (options.requireApproved) {
    conditions.push(eq(commentsTable.isApproved, true));
  } else {
    const approvedFilter = parseIsApprovedFilter(options.isApproved);
    if (approvedFilter === true) {
      conditions.push(eq(commentsTable.isApproved, true));
    } else if (approvedFilter === false) {
      conditions.push(eq(commentsTable.isApproved, false));
    }
  }

  const pagination = paginationBuilder(url);
  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  const selectFields = options.includeModerationFields
    ? {
        id: commentsTable.id,
        productId: commentsTable.productId,
        body: commentsTable.body,
        image: commentsTable.image,
        isApproved: commentsTable.isApproved,
        createdAt: commentsTable.createdAt,
        updatedAt: commentsTable.updatedAt,
        user: {
          id: usersTable.id,
          name: usersTable.name,
          lastName: usersTable.lastName,
        },
        product: {
          id: productsTable.id,
          prName: productsTable.prName,
          enName: productsTable.enName,
        },
      }
    : {
        id: commentsTable.id,
        productId: commentsTable.productId,
        body: commentsTable.body,
        image: commentsTable.image,
        user: {
          id: usersTable.id,
          name: usersTable.name,
          lastName: usersTable.lastName,
        },
        createdAt: commentsTable.createdAt,
        updatedAt: commentsTable.updatedAt,
      };

  const comments = await db
    .select(selectFields)
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(commentsTable.productId, productsTable.id))
    .where(whereClause)
    .orderBy(desc(commentsTable.createdAt))
    .offset(pagination.skip)
    .limit(pagination.limit);

  const [total] = await db
    .select({ count: count() })
    .from(commentsTable)
    .where(whereClause);

  const hasMore = pagination.page * pagination.limit < total.count;

  return {
    comments,
    total: total.count,
    pagination,
    hasMore,
  };
};

export const getComments = async (c: Context) => {
  const url = c.req.query();
  const { comments, total, pagination, hasMore } = await fetchComments(
    {
      productId: url.productId,
      userId: url.userId,
      requireApproved: true,
    },
    url
  );

  return c.json(
    paginatedResponseBuilder(
      comments,
      "Comments retrieved successfully",
      total,
      pagination.page,
      hasMore,
      true
    )
  );
};

export const getAdminComments = async (c: Context) => {
  const url = c.req.query();
  const { comments, total, pagination, hasMore } = await fetchComments(
    {
      productId: url.productId,
      userId: url.userId,
      isApproved: url.isApproved as CommentQueryOptions["isApproved"],
      includeModerationFields: true,
    },
    url
  );

  return c.json(
    paginatedResponseBuilder(
      comments,
      "Comments retrieved successfully",
      total,
      pagination.page,
      hasMore,
      true
    )
  );
};

export const createComment = async (c: Context) => {
  const body = await c.req.json();

  const [newComment] = await db
    .insert(commentsTable)
    .values({
      userId: body.userId,
      productId: body.productId,
      body: body.body,
      image: body.image,
      isApproved: false,
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
  const body = await c.req.json();

  const updateData: Partial<typeof commentsTable.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (body.isApproved !== undefined) updateData.isApproved = body.isApproved;
  if (body.image !== undefined) updateData.image = body.image;

  const [comment] = await db
    .update(commentsTable)
    .set(updateData)
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
