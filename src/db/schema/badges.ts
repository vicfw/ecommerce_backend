import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { badgesToProducts } from "./badgesToProducts";

export const badgesTable = pgTable("badges", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull().unique(),
  icon: text("icon").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const badgesRelations = relations(badgesTable, ({ many }) => ({
  badgesToProducts: many(badgesToProducts),
}));
