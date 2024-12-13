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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productsRelations = relations(productsTable, ({ many }) => ({
  badgesToProducts: many(badgesToProducts),
}));
