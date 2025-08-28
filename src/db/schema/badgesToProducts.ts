import { relations } from "drizzle-orm";
import { integer, pgTable } from "drizzle-orm/pg-core";
import { badgesTable } from "./badges";
import { productsTable } from "./products";

export const badgesToProducts = pgTable("badges_to_products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  badgeId: integer("badge_id").references(() => badgesTable.id, {
    onDelete: "cascade",
  }),
  productId: integer("product_id").references(() => productsTable.id, {
    onDelete: "cascade",
  }),
});

export const badgesToProductsRelations = relations(
  badgesToProducts,
  ({ one }) => ({
    badge: one(badgesTable, {
      fields: [badgesToProducts.badgeId],
      references: [badgesTable.id],
    }),
    product: one(productsTable, {
      fields: [badgesToProducts.productId],
      references: [productsTable.id],
    }),
  })
);
