import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { usersTable } from "./users";

export const commentsTable = pgTable("comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  body: text().notNull(),
  image: text().notNull(),
  isApproved: boolean().default(false),
  productId: integer("productId").references(() => productsTable.id),
  userId: integer("userId").references(() => usersTable.id),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
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
