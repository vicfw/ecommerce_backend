import { count, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { genToken } from "../utils";
import { refreshUserOtp } from "../utils/refreshUserOtp";
import { verifyUserOtp } from "../utils/verifyUserOtp";
import {
  emptyOrdersByStatus,
  REVENUE_STATUSES,
} from "../constants/orderStatus";
import { commentsTable } from "../db/schema/comments";
import { ordersTable } from "../db/schema/orders";
import { productsTable } from "../db/schema/products";
import { usersTable } from "../db/schema/users";
import { availableStockSql } from "../utils/inventory";

const LOW_STOCK_THRESHOLD = 5;

export const adminRequestOtp = async (c: Context) => {
  const { phoneNumber } = c.req.valid("json");

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.phoneNumber, phoneNumber),
  });

  if (!user?.isAdmin) {
    throw new HTTPException(403, {
      message: "Not authorized as an admin!",
    });
  }

  const code = await refreshUserOtp(phoneNumber);

  return c.json({
    success: true,
    code,
    message: "Admin verification code sent.",
  });
};

export const adminLogin = async (c: Context) => {
  const { code, phoneNumber } = c.req.valid("json");
  const user = await verifyUserOtp(phoneNumber, code);

  if (!user.isAdmin) {
    throw new HTTPException(403, {
      message: "Not authorized as an admin!",
    });
  }

  const token = await genToken(user.id.toString());

  return c.json({
    success: true,
    data: {
      id: user.id,
      phoneNumber: user.phoneNumber,
      isAdmin: user.isAdmin,
      token,
    },
    message: "Admin logged in successfully",
  });
};

export const getDashboard = async (c: Context) => {
  const [totalOrdersResult] = await db
    .select({ count: count() })
    .from(ordersTable);

  const statusCounts = await db
    .select({
      status: ordersTable.status,
      count: count(ordersTable.status),
    })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  const ordersByStatus = emptyOrdersByStatus();

  statusCounts.forEach((row) => {
    if (row.status && row.status in ordersByStatus) {
      ordersByStatus[row.status as keyof typeof ordersByStatus] = row.count;
    }
  });

  const [revenueResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
    })
    .from(ordersTable)
    .where(inArray(ordersTable.status, REVENUE_STATUSES));

  const [totalUsersResult] = await db
    .select({ count: count() })
    .from(usersTable);

  const [pendingCommentsResult] = await db
    .select({ count: count() })
    .from(commentsTable)
    .where(eq(commentsTable.isApproved, false));

  const lowStockProducts = await db
    .select({
      id: productsTable.id,
      prName: productsTable.prName,
      quantity: availableStockSql,
      reservedQuantity: productsTable.reservedQuantity,
    })
    .from(productsTable)
    .where(lte(availableStockSql, LOW_STOCK_THRESHOLD))
    .orderBy(availableStockSql)
    .limit(10);

  const recentOrders = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      totalAmount: ordersTable.totalAmount,
      createdAt: ordersTable.createdAt,
      user: {
        id: usersTable.id,
        phoneNumber: usersTable.phoneNumber,
        name: usersTable.name,
        lastName: usersTable.lastName,
      },
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  return c.json({
    success: true,
    data: {
      totalOrders: totalOrdersResult.count,
      ordersByStatus,
      totalRevenue: Number(revenueResult.total) || 0,
      totalUsers: totalUsersResult.count,
      pendingComments: pendingCommentsResult.count,
      lowStockProducts,
      recentOrders,
    },
    message: "Dashboard stats retrieved successfully",
  });
};
