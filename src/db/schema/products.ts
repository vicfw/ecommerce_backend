import { relations } from "drizzle-orm";
import {
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { badgesToProducts } from "./badgesToProducts";
import { categoriesTable } from "./categories";
import { brandsTable } from "./brands";
import { commentsTable } from "./comments";

export const productsTable = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  prName: varchar("pr_name", { length: 255 }).default("محصول 1"),
  enName: varchar("en_name", { length: 255 }).default("product 1"),
  slug: varchar("slug", { length: 255 }).default("1-product-1"),
  price: doublePrecision("price").notNull(),
  discount: doublePrecision("discount").default(0),
  weight: doublePrecision("weight").default(0),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  images: text("images").array(),
  point: integer("point").default(0),
  categoryId: integer().notNull(),
  brandId: integer(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productsRelations = relations(productsTable, ({ many, one }) => ({
  badgesToProducts: many(badgesToProducts),
  category: one(categoriesTable, {
    fields: [productsTable.categoryId],
    references: [categoriesTable.id],
  }),
  brand: one(brandsTable, {
    fields: [productsTable.brandId],
    references: [brandsTable.id],
  }),
  comments: many(commentsTable),
}));
