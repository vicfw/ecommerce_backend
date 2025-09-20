import { Hono } from "hono";
import { category } from "../controllers";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";

const categories = new Hono();

// get all categories
categories.get("/", (c) => category.getCategories(c));

// Get categories by level
categories.get("/level/:level", (c) => category.getCategoriesByLevel(c));

// Get category full path (category → parent → grandparent)
categories.get("/:id/path", (c) => category.getCategoryFullPath(c));

// Create parent category (level 1)
categories.post(
  "/parent",
  zValidator("json", validation.parentCategorySchema),
  (c) => category.createParentCategory(c)
);

// Create child category (level 2)
categories.post(
  "/child",
  zValidator("json", validation.childCategorySchema),
  (c) => category.createChildCategory(c)
);

// Create subchild category (level 3)
categories.post(
  "/subchild",
  zValidator("json", validation.subchildCategorySchema),
  (c) => category.createSubChildCategory(c)
);

categories.delete("/:id", (c) => category.deleteCategory(c));

// Delete all categories
categories.delete("/all", (c) => category.deleteAllCategories(c));

categories.patch(
  "/:id",
  zValidator("json", validation.categorySchema.partial()),
  (c) => category.updateCategory(c)
);

export default categories;
