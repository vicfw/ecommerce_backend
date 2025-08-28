import { relations } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const brandsTable = pgTable("colors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  engName: text("eng_name").notNull(),
  slug: text("slug").notNull(),
});

export const brandsRelations = relations(brandsTable, ({ many }) => ({
  product: many(productsTable),
}));
