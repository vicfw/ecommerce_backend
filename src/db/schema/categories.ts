import { relations } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const categoriesTable = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  image: text().notNull(),
});

export const categoriesRelations = relations(
  categoriesTable,
  ({ many, one }) => ({
    product: many(productsTable),
  })
);
