import { relations } from "drizzle-orm";
import { integer, pgTable, real, timestamp } from "drizzle-orm/pg-core";
import { cartItemsTable } from "./cartItems";
import { deliveryCostsTable } from "./deliveryCosts";
import { usersTable } from "./users";

export const cartsTable = pgTable("carts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  price: real("price").notNull(),
  profitFromDiscount: integer("profit_from_discount").default(0),
  totalDiscountPercentage: integer("total_discount_percentage").default(0),
  discountPrice: integer("discount_price").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

  deliveryCostId: integer("delivery_cost_id").notNull(),
  userId: integer().notNull(),
});

export const cartsRelation = relations(cartsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [cartsTable.userId],
    references: [usersTable.id],
  }),

  deliveryCost: one(deliveryCostsTable, {
    fields: [cartsTable.deliveryCostId],
    references: [deliveryCostsTable.id],
  }),

  cartItems: many(cartItemsTable),
}));
