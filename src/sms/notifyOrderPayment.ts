import { eq } from "drizzle-orm";
import { db } from "../db";
import { ordersTable } from "../db/schema/orders";
import { usersTable } from "../db/schema/users";
import { logger } from "../lib/logger";
import { sendSms } from "./sendSms";

type OrderPaymentKind = "success" | "failed";

export const notifyOrderPayment = async ({
  orderId,
  kind,
}: {
  orderId: number;
  kind: OrderPaymentKind;
}) => {
  try {
    const [order] = await db
      .select({
        id: ordersTable.id,
        totalAmount: ordersTable.totalAmount,
        phoneNumber: usersTable.phoneNumber,
      })
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!order?.phoneNumber) return;

    const text =
      kind === "success"
        ? `سفارش ${order.id} با موفقیت پرداخت شد. مبلغ ${order.totalAmount.toLocaleString("fa-IR")} تومان`
        : `پرداخت سفارش ${order.id} ناموفق بود`;

    await sendSms(order.phoneNumber, text);
  } catch (err) {
    logger.error({ err, orderId, kind }, "order_payment_sms_failed");
  }
};
