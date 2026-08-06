import { Hono } from "hono";
import { category } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";

const categories = new Hono();

// get all categories
categories.get("/", (c) => category.getCategories(c));

// Get categories by level
categories.get("/level/:level", (c) => category.getCategoriesByLevel(c));

// Get category full path (category → parent → grandparent)
categories.get("/:id/path", (c) => category.getCategoryFullPath(c));

// Get categories by id
categories.get("/:id", (c) => category.getCategoriesById(c));

// Create parent category (level 1)
categories.post(
  "/parent",
  protect,
  isAdmin,
  zValidator("json", validation.parentCategorySchema),
  (c) => category.createParentCategory(c)
);

// Create child category (level 2)
categories.post(
  "/child",
  protect,
  isAdmin,
  zValidator("json", validation.childCategorySchema),
  (c) => category.createChildCategory(c)
);

// Create subchild category (level 3)
categories.post(
  "/subchild",
  protect,
  isAdmin,
  zValidator("json", validation.subchildCategorySchema),
  (c) => category.createSubChildCategory(c)
);

categories.delete("/all", protect, isAdmin, (c) =>
  category.deleteAllCategories(c)
);

categories.delete("/:id", protect, isAdmin, (c) =>
  category.deleteCategory(c)
);

categories.patch(
  "/:id",
  protect,
  isAdmin,
  zValidator("json", validation.updateCategorySchema),
  (c) => category.updateCategory(c)
);

export default categories;
