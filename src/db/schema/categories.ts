import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const categoriesTable = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),

  // Parent category fields (only for top-level categories)
  isParent: boolean("is_parent").notNull().default(false),
  parentImage: text("parent_image"),
  parentBanner: text("parent_banner"),

  // Child/Subchild fields (for all non-parent categories)
  image: text("image"),
  color: text("color"),
  icon: text("icon"),

  // Hierarchy fields
  parentId: integer("parent_id"),
  level: integer("level").notNull().default(1), // 1=parent, 2=child, 3=subchild

  // Common fields
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categoriesRelations = relations(
  categoriesTable,
  ({ many, one }) => ({
    // Self-referencing for hierarchy
    parent: one(categoriesTable, {
      fields: [categoriesTable.parentId],
      references: [categoriesTable.id],
      relationName: "parent_child",
    }),
    children: many(categoriesTable, {
      relationName: "parent_child",
    }),

    // Products relation
    products: many(productsTable),
  })
);
