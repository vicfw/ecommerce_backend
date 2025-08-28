import { relations } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const colorImagesTable = pgTable("color_image", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  images: text("images").array().notNull(),
  colorImage: text("color_image").notNull(),
  name: text("name").notNull(),
  productId: integer("product_id").references(() => productsTable.id, {
    onDelete: "cascade",
  }),
});

export const colorImagesRelations = relations(colorImagesTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [colorImagesTable.productId],
    references: [productsTable.id],
  }),
}));
