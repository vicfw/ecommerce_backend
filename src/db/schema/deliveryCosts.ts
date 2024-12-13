import { relations } from "drizzle-orm";
import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { cartsTable } from "./carts";

export const deliveryCostsTable = pgTable("delivery_costs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  cost: integer("cost").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deliveryCostRelations = relations(
  deliveryCostsTable,
  ({ many }) => ({
    carts: many(cartsTable),
  })
);
