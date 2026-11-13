import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { orderItemsTable } from "../db/schema/orderItems";
import { ordersTable } from "../db/schema/orders";
import { productsTable } from "../db/schema/products";
import type { OrderStatus } from "../constants/orderStatus";
import { logger } from "../lib/logger";
import { scheduleLowStockAlertSync } from "./lowStockAlert";
import { purgeAfterProductWrite } from "./purgeCatalog";

/** After inventory commits: drop product slug Redis keys + bump list version. */
export const purgeCatalogForProductIds = async (
  productIds: Iterable<number>
): Promise<void> => {
  const ids = [
    ...new Set(
      [...productIds].filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  if (ids.length === 0) return;

  const rows = await db
    .select({ slug: productsTable.slug })
    .from(productsTable)
    .where(inArray(productsTable.id, ids));

  await purgeAfterProductWrite({
    slugs: rows.map((row) => row.slug).filter(Boolean),
  });
};

/** Catalog purge + low-stock Telegram sync after inventory commits. */
export const afterInventoryCommit = async (
  productIds: Iterable<number>
): Promise<void> => {
  const ids = [...productIds];
  scheduleLowStockAlertSync(ids);
  await purgeCatalogForProductIds(ids);
};

export const INVENTORY_STATUSES = ["reserved", "deducted", "released"] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export const RESERVATION_TTL_MINUTES = 30;

export type DbOrTrx =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ProductStock = {
  quantity: number;
  reservedQuantity: number | null;
};

export const availableStock = (product: ProductStock) =>
  Math.max(0, product.quantity - (product.reservedQuantity ?? 0));

export const reservationExpiryDate = (from = new Date()) =>
  new Date(from.getTime() + RESERVATION_TTL_MINUTES * 60 * 1000);

export const quantityLimitError = () =>
  new HTTPException(400, {
    message: "Product quantity is not enough",
    cause: "quantity limit",
  });

export const availableStockSql = sql<number>`GREATEST(${productsTable.quantity} - COALESCE(${productsTable.reservedQuantity}, 0), 0)`;

export const groupQuantitiesByProductId = (
  items: { productId: number; quantity: number }[]
) => {
  const quantities = new Map<number, number>();
  for (const item of items) {
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity
    );
  }
  return quantities;
};

const sortedProductIds = (quantities: Map<number, number>) =>
  [...quantities.keys()].sort((a, b) => a - b);

const lockProducts = async (trx: DbOrTrx, productIds: number[]) => {
  if (productIds.length === 0) return [];

  return trx
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, productIds))
    .for("update");
};

export const quantitiesForOrder = async (trx: DbOrTrx, orderId: number) => {
  const items = await trx
    .select({
      productId: orderItemsTable.productId,
      quantity: orderItemsTable.quantity,
    })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  return groupQuantitiesByProductId(items);
};

export const reserve = async (
  trx: DbOrTrx,
  quantities: Map<number, number>
) => {
  const ids = sortedProductIds(quantities);
  const products = await lockProducts(trx, ids);
  const byId = new Map(products.map((product) => [product.id, product]));

  for (const id of ids) {
    const qty = quantities.get(id) ?? 0;
    if (qty <= 0) continue;

    const product = byId.get(id);
    if (!product) {
      throw new HTTPException(400, {
        message: "Product not found",
        cause: "product not found",
      });
    }

    if (qty > availableStock(product)) {
      throw quantityLimitError();
    }
  }

  for (const id of ids) {
    const qty = quantities.get(id) ?? 0;
    if (qty <= 0) continue;

    await trx
      .update(productsTable)
      .set({
        reservedQuantity: sql`${productsTable.reservedQuantity} + ${qty}`,
        updatedAt: new Date(),
      })
      .where(eq(productsTable.id, id));
  }
};

export const deductReserved = async (
  trx: DbOrTrx,
  quantities: Map<number, number>
) => {
  const ids = sortedProductIds(quantities);
  await lockProducts(trx, ids);

  for (const id of ids) {
    const qty = quantities.get(id) ?? 0;
    if (qty <= 0) continue;

    const [updated] = await trx
      .update(productsTable)
      .set({
        quantity: sql`${productsTable.quantity} - ${qty}`,
        reservedQuantity: sql`GREATEST(${productsTable.reservedQuantity} - ${qty}, 0)`,
        updatedAt: new Date(),
      })
      .where(
        and(eq(productsTable.id, id), sql`${productsTable.quantity} >= ${qty}`)
      )
      .returning({ id: productsTable.id });

    if (!updated) {
      throw new HTTPException(500, {
        message: "Failed to deduct reserved inventory",
      });
    }
  }
};

export const releaseReservation = async (
  trx: DbOrTrx,
  quantities: Map<number, number>
) => {
  const ids = sortedProductIds(quantities);
  await lockProducts(trx, ids);

  for (const id of ids) {
    const qty = quantities.get(id) ?? 0;
    if (qty <= 0) continue;

    await trx
      .update(productsTable)
      .set({
        reservedQuantity: sql`GREATEST(${productsTable.reservedQuantity} - ${qty}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(productsTable.id, id));
  }
};

export const restoreSold = async (
  trx: DbOrTrx,
  quantities: Map<number, number>
) => {
  const ids = sortedProductIds(quantities);
  await lockProducts(trx, ids);

  for (const id of ids) {
    const qty = quantities.get(id) ?? 0;
    if (qty <= 0) continue;

    await trx
      .update(productsTable)
      .set({
        quantity: sql`${productsTable.quantity} + ${qty}`,
        updatedAt: new Date(),
      })
      .where(eq(productsTable.id, id));
  }
};

export const applyInventoryForOrderStatus = async (
  trx: DbOrTrx,
  order: { id: number; inventoryStatus: string | null },
  newStatus: OrderStatus
): Promise<{ inventoryStatus: InventoryStatus; productIds: number[] }> => {
  const current = (INVENTORY_STATUSES.includes(
    order.inventoryStatus as InventoryStatus
  )
    ? order.inventoryStatus
    : "released") as InventoryStatus;

  if (current === "released") {
    return { inventoryStatus: "released", productIds: [] };
  }

  const quantities = await quantitiesForOrder(trx, order.id);
  const productIds = [...quantities.keys()];

  if (current === "reserved") {
    if (newStatus === "cancelled" || newStatus === "returned") {
      await releaseReservation(trx, quantities);
      return { inventoryStatus: "released", productIds };
    }

    if (
      newStatus === "processing" ||
      newStatus === "shipped" ||
      newStatus === "delivered"
    ) {
      await deductReserved(trx, quantities);
      return { inventoryStatus: "deducted", productIds };
    }

    return { inventoryStatus: "reserved", productIds: [] };
  }

  if (newStatus === "cancelled" || newStatus === "returned") {
    await restoreSold(trx, quantities);
    return { inventoryStatus: "released", productIds };
  }

  return { inventoryStatus: "deducted", productIds: [] };
};

export const cancelReservedOrder = async (trx: DbOrTrx, orderId: number) => {
  const quantities = await quantitiesForOrder(trx, orderId);
  await releaseReservation(trx, quantities);
  await trx
    .update(ordersTable)
    .set({
      status: "cancelled",
      inventoryStatus: "released",
      paymentTrackId: null,
      paymentInitStartedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, orderId));
};

export const releaseUnpaidOrder = async (orderId: number) => {
  const productIds: number[] = [];
  const released = await db.transaction(async (trx) => {
    const [order] = await trx
      .select({
        id: ordersTable.id,
        inventoryStatus: ordersTable.inventoryStatus,
      })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .for("update");

    if (!order || order.inventoryStatus !== "reserved") {
      return false;
    }

    const quantities = await quantitiesForOrder(trx, order.id);
    productIds.push(...quantities.keys());
    await cancelReservedOrder(trx, order.id);
    logger.warn({ orderId }, "unpaid_order_released");
    return true;
  });

  if (released) {
    await afterInventoryCommit(productIds);
  }

  return Boolean(released);
};

export const expireStaleReservations = async () => {
  const productIds: number[] = [];

  await db.transaction(async (trx) => {
    const staleOrders = await trx
      .select({
        id: ordersTable.id,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.inventoryStatus, "reserved"),
          eq(ordersTable.status, "pending"),
          lt(ordersTable.reservationExpiresAt, new Date())
        )
      )
      .for("update");

    for (const order of staleOrders) {
      const quantities = await quantitiesForOrder(trx, order.id);
      productIds.push(...quantities.keys());
      await cancelReservedOrder(trx, order.id);
    }

    if (staleOrders.length > 0) {
      logger.info({ count: staleOrders.length }, "stale_reservations_expired");
    }
  });

  await afterInventoryCommit(productIds);
};
