import { and, count, desc, eq } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { getLogger } from "hono-pino";
import { db } from "../db";
import { ordersTable } from "../db/schema/orders";
import { returnRequestsTable } from "../db/schema/returnRequests";
import { usersTable } from "../db/schema/users";
import {
  paginationBuilder,
  paginatedResponseBuilder,
} from "../utils/builder/builderFunc";
import { maybeReleaseCouponUse } from "../utils/coupon";
import { isUniqueViolation } from "../utils/isUniqueViolation";
import {
  afterInventoryCommit,
  applyInventoryForOrderStatus,
} from "../utils/inventory";

const RETURN_STATUSES = ["pending", "approved", "rejected"] as const;

export const createReturnRequest = async (c: Context) => {
  const user = c.get("user");
  const { orderId, reason } = await c.req.json();

  const [order] = await db
    .select({
      id: ordersTable.id,
      userId: ordersTable.userId,
      status: ordersTable.status,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order || order.userId !== user.id) {
    throw new HTTPException(404, { message: "Order not found" });
  }

  if (order.status !== "delivered") {
    throw new HTTPException(400, {
      message: "Return requests are only allowed for delivered orders",
    });
  }

  const [existing] = await db
    .select({ id: returnRequestsTable.id })
    .from(returnRequestsTable)
    .where(eq(returnRequestsTable.orderId, orderId))
    .limit(1);

  if (existing) {
    throw new HTTPException(400, {
      message: "A return request already exists for this order",
    });
  }

  try {
    const [created] = await db
      .insert(returnRequestsTable)
      .values({
        orderId,
        reason: String(reason).trim(),
        status: "pending",
      })
      .returning();

    getLogger(c).info(
      { orderId, returnRequestId: created.id, userId: user.id },
      "return_request_created"
    );

    return c.json({
      success: true,
      data: created,
      message: "Return request created successfully",
    });
  } catch (error) {
    if (error instanceof HTTPException || !isUniqueViolation(error)) {
      throw error;
    }
    throw new HTTPException(400, {
      message: "A return request already exists for this order",
    });
  }
};

export const getReturnRequestForOrder = async (c: Context) => {
  const user = c.get("user");
  const orderId = +c.req.param("orderId");

  if (Number.isNaN(orderId)) {
    throw new HTTPException(400, { message: "Invalid order id" });
  }

  const [order] = await db
    .select({ id: ordersTable.id, userId: ordersTable.userId })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order || order.userId !== user.id) {
    throw new HTTPException(404, { message: "Order not found" });
  }

  const [request] = await db
    .select()
    .from(returnRequestsTable)
    .where(eq(returnRequestsTable.orderId, orderId))
    .limit(1);

  return c.json({
    success: true,
    data: request ?? null,
    message: "Return request retrieved successfully",
  });
};

export const getAdminReturnRequests = async (c: Context) => {
  const status = c.req.query("status");
  const page = c.req.query("page");
  const limit = c.req.query("limit");
  const perPage = c.req.query("perPage");
  const pagination = paginationBuilder({ page, limit, perPage });

  const conditions = [];
  if (status) {
    if (!RETURN_STATUSES.includes(status as (typeof RETURN_STATUSES)[number])) {
      throw new HTTPException(400, { message: "Invalid return request status" });
    }
    conditions.push(eq(returnRequestsTable.status, status));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: returnRequestsTable.id,
      orderId: returnRequestsTable.orderId,
      reason: returnRequestsTable.reason,
      status: returnRequestsTable.status,
      createdAt: returnRequestsTable.createdAt,
      updatedAt: returnRequestsTable.updatedAt,
      orderStatus: ordersTable.status,
      user: {
        id: usersTable.id,
        name: usersTable.name,
        lastName: usersTable.lastName,
        phoneNumber: usersTable.phoneNumber,
      },
    })
    .from(returnRequestsTable)
    .innerJoin(ordersTable, eq(returnRequestsTable.orderId, ordersTable.id))
    .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .where(where)
    .orderBy(desc(returnRequestsTable.createdAt))
    .limit(pagination.limit)
    .offset(pagination.skip);

  const [total] = await db
    .select({ count: count() })
    .from(returnRequestsTable)
    .where(where);

  const hasMore = pagination.page * pagination.limit < total.count;

  return c.json(
    paginatedResponseBuilder(
      rows,
      "Return requests retrieved successfully",
      total.count,
      pagination.page,
      hasMore,
      true
    )
  );
};

export const updateAdminReturnRequest = async (c: Context) => {
  const { id } = c.req.param();
  const { status } = await c.req.json();

  if (Number.isNaN(+id)) {
    throw new HTTPException(404, { message: "Return request not found" });
  }

  if (status !== "approved" && status !== "rejected") {
    throw new HTTPException(400, { message: "Invalid status" });
  }

  const { updated, productIds } = await db.transaction(async (trx) => {
    const [request] = await trx
      .select()
      .from(returnRequestsTable)
      .where(eq(returnRequestsTable.id, +id))
      .for("update");

    if (!request) {
      throw new HTTPException(404, { message: "Return request not found" });
    }

    if (request.status !== "pending") {
      throw new HTTPException(400, {
        message: "Return request has already been resolved",
      });
    }

    if (status === "rejected") {
      const [updatedRequest] = await trx
        .update(returnRequestsTable)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(returnRequestsTable.id, request.id))
        .returning();

      return { updated: updatedRequest, productIds: [] as number[] };
    }

    const [order] = await trx
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, request.orderId))
      .for("update");

    if (!order) {
      throw new HTTPException(404, { message: "Order not found" });
    }

    if (order.status !== "delivered") {
      throw new HTTPException(400, {
        message: "Only delivered orders can be returned",
      });
    }

    const inventory = await applyInventoryForOrderStatus(
      trx,
      order,
      "returned"
    );

    await maybeReleaseCouponUse(trx, order, "returned");

    await trx
      .update(ordersTable)
      .set({
        status: "returned",
        inventoryStatus: inventory.inventoryStatus,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, order.id));

    const [updatedRequest] = await trx
      .update(returnRequestsTable)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(returnRequestsTable.id, request.id))
      .returning();

    getLogger(c).info(
      { orderId: order.id, returnRequestId: request.id },
      "return_request_approved"
    );

    return { updated: updatedRequest, productIds: inventory.productIds };
  });

  await afterInventoryCommit(productIds);

  return c.json({
    success: true,
    data: updated,
    message: "Return request updated successfully",
  });
};
