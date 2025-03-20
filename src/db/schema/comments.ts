import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { usersTable } from "./users";

export const commentsTable = pgTable("comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  body: text().notNull(),
  rate: integer().notNull(),
  image: text().notNull(),
  isApproved: boolean().default(false),
  productId: integer("productId").references(() => productsTable.id),
  userId: integer("userId").references(() => usersTable.id),
});

export const commentsRelations = relations(commentsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [commentsTable.productId],
    references: [productsTable.id],
  }),
  user: one(usersTable, {
    fields: [commentsTable.userId],
    references: [usersTable.id],
  }),
}));
