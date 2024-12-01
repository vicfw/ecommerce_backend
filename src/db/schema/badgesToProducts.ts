import { relations } from "drizzle-orm";
import { integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { badgesTable } from "./badges";
import { productsTable } from "./products";

export const badgesToProducts = pgTable(
  "badges_to_products",
  {
    badgeId: integer("badge_id")
      .notNull()
      .references(() => badgesTable.id),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.badgeId, t.productId] }),
  })
);

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
