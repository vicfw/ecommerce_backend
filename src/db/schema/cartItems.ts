import { relations } from "drizzle-orm";
import { integer, pgTable, real } from "drizzle-orm/pg-core";
import { cartsTable } from "./carts";
import { productsTable } from "./products";

export const cartItemsTable = pgTable("cart_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  quantity: integer("quantity").notNull(),
  itemPrice: real("item_price").notNull(),
  productId: integer("product_id").notNull(),
  cartId: integer("cart_id").notNull(),
});

export const cartItemsRelations = relations(cartItemsTable, ({ one }) => ({
  cart: one(cartsTable, {
    fields: [cartItemsTable.cartId],
    references: [cartsTable.id],
  }),
  product: one(productsTable, {
    fields: [cartItemsTable.productId],
    references: [productsTable.id],
  }),
}));
