import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";

export const returnRequestsTable = pgTable("return_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer("order_id")
    .notNull()
    .unique()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const returnRequestsRelations = relations(
  returnRequestsTable,
  ({ one }) => ({
    order: one(ordersTable, {
      fields: [returnRequestsTable.orderId],
      references: [ordersTable.id],
    }),
  })
);
