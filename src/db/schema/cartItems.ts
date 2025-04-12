import { relations } from "drizzle-orm";
import { integer, pgTable, real, varchar } from "drizzle-orm/pg-core";
import { cartsTable } from "./carts";
import { productsTable } from "./products";
import { anonCartsTable } from "./anonCarts";
import { colorImagesTable } from "./colorImage";

export const cartItemsTable = pgTable("cart_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  quantity: integer("quantity").notNull(),
  itemPrice: real("item_price").notNull(),
  productId: integer("product_id").notNull(),
  cartId: integer("cart_id"),
  anonCartId: varchar("anon_cart_id", { length: 255 }),
  coloImageId: integer("color_image_id"),
});

export const cartItemsRelations = relations(cartItemsTable, ({ one }) => ({
  cart: one(cartsTable, {
    fields: [cartItemsTable.cartId],
    references: [cartsTable.id],
  }),
  anonCart: one(anonCartsTable, {
    fields: [cartItemsTable.anonCartId],
    references: [anonCartsTable.id],
  }),
  product: one(productsTable, {
    fields: [cartItemsTable.productId],
    references: [productsTable.id],
  }),
  colorImage: one(colorImagesTable, {
    fields: [cartItemsTable.coloImageId],
    references: [colorImagesTable.id],
  }),
}));
