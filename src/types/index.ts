export type Category =
  typeof import("../db/schema/categories").categoriesTable.$inferSelect;
export type NewCategory =
  typeof import("../db/schema/categories").categoriesTable.$inferInsert;
export type CategoryWithRelations =
  typeof import("../db/schema/categories").categoriesTable.$inferSelect & {
    parent?: CategoryWithRelations | null;
    children?: CategoryWithRelations[];
    products?: any[];
  };
