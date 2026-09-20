import { relations, sql } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  real,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { addressesTable } from "./addresses";
import { usersTable } from "./users";
import { orderItemsTable } from "./orderItems";

export const statusEnum = pgEnum("status", [
  "pending",
  "processing",
  "shipped",
  "returned",
  "delivered",
  "cancelled",
]);

export const ordersTable = pgTable(
  "orders",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id").notNull(),
    addressId: integer("address_id").notNull(),
    totalAmount: integer("total_amount").notNull(),
    profitFromDiscount: real("profit_from_discount").default(0),
    status: varchar("status").default(statusEnum.enumValues[0]),
    inventoryStatus: varchar("inventory_status").default("released"),
    reservationExpiresAt: timestamp("reservation_expires_at"),
    paymentTrackId: varchar("payment_track_id"),
    paymentInitStartedAt: timestamp("payment_init_started_at"),
    deliveryAmount: integer("delivery_amount").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    onePendingReservedPerUser: uniqueIndex(
      "orders_one_pending_reserved_per_user"
    )
      .on(table.userId)
      .where(
        sql`${table.status} = 'pending' AND ${table.inventoryStatus} = 'reserved'`
      ),
  })
);

export const orderRelations = relations(ordersTable, ({ one, many }) => ({
  address: one(addressesTable, {
    fields: [ordersTable.addressId],
    references: [addressesTable.id],
  }),
  user: one(usersTable, {
    fields: [ordersTable.userId],
    references: [usersTable.id],
  }),
  orderItems: many(orderItemsTable),
}));
