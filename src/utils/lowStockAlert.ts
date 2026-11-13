import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { productsTable } from "../db/schema/products";
import { logger } from "../lib/logger";

export const LOW_STOCK_THRESHOLD = 5;

export type LowStockAction =
  | { type: "notify"; available: number }
  | { type: "clear" }
  | { type: "noop" };

export const lowStockAction = (
  available: number,
  notified: boolean
): LowStockAction => {
  if (available <= LOW_STOCK_THRESHOLD && !notified) {
    return { type: "notify", available };
  }
  if (available > LOW_STOCK_THRESHOLD && notified) {
    return { type: "clear" };
  }
  return { type: "noop" };
};

export const sendTelegramMessage = async (text: string): Promise<boolean> => {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    logger.warn("telegram_not_configured");
    return true;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error(
        { status: res.status, body },
        "telegram_send_message_failed"
      );
      return false;
    }

    return true;
  } catch (err) {
    logger.error({ err }, "telegram_send_message_failed");
    return false;
  }
};

const formatLowStockMessage = (product: {
  id: number;
  prName: string | null;
  available: number;
}) =>
  `Low stock: ${product.prName ?? "product"} (id=${product.id}) available=${product.available}`;

export const syncLowStockAlerts = async (
  productIds: Iterable<number>
): Promise<void> => {
  const ids = [
    ...new Set(
      [...productIds].filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  if (ids.length === 0) return;

  const rows = await db
    .select({
      id: productsTable.id,
      prName: productsTable.prName,
      quantity: productsTable.quantity,
      reservedQuantity: productsTable.reservedQuantity,
      lowStockNotified: productsTable.lowStockNotified,
    })
    .from(productsTable)
    .where(inArray(productsTable.id, ids));

  for (const row of rows) {
    const available = Math.max(
      0,
      row.quantity - (row.reservedQuantity ?? 0)
    );
    const action = lowStockAction(available, row.lowStockNotified);

    if (action.type === "notify") {
      const sent = await sendTelegramMessage(
        formatLowStockMessage({
          id: row.id,
          prName: row.prName,
          available: action.available,
        })
      );
      if (!sent) continue;

      await db
        .update(productsTable)
        .set({ lowStockNotified: true, updatedAt: new Date() })
        .where(eq(productsTable.id, row.id));
    } else if (action.type === "clear") {
      await db
        .update(productsTable)
        .set({ lowStockNotified: false, updatedAt: new Date() })
        .where(eq(productsTable.id, row.id));
    }
  }
};

/** Fire-and-forget so Telegram is not blocked behind Meili/purge. */
export const scheduleLowStockAlertSync = (
  productIds: Iterable<number>
): void => {
  void syncLowStockAlerts(productIds).catch((err) => {
    logger.error({ err }, "low_stock_alert_sync_failed");
  });
};
