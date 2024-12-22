import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  real,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { addressesTable } from "./addresses";
import { usersTable } from "./users";
import { orderItemsTable } from "./orderItems";

const status = pgEnum("status", [
  "pending",
  "processing",
  "shipped",
  "returned",
  "delivered",
  "cancelled",
]);

export const ordersTable = pgTable("orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  addressId: integer("address_id").notNull(),
  totalAmount: integer("total_amount").notNull(),
  profitFromDiscount: real("profit_from_discount").default(0),
  status: varchar("status").default(status.enumValues[1]),
  deliveryAmount: integer("delivery_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
