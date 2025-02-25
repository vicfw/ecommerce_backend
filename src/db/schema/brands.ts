import { relations } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const brandsTable = pgTable("brands", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  image: text().notNull(),
});

export const brandsRelations = relations(brandsTable, ({ many }) => ({
  product: many(productsTable),
}));
