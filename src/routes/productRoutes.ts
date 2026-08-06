import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { product } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { validation } from "../validation";

const products = new Hono();

products.post(
  "/",
  protect,
  isAdmin,
  zValidator("json", validation.productSchema),
  (c) => product.createProduct(c)
);
products.get("/", (c) => product.getProducts(c));
products.get("/filters", (c) => product.getProductFilters(c));

// Admin routes (must be before /:slug)
products.get("/admin", protect, isAdmin, (c) => product.getProducts(c));
products.get("/admin/:id", protect, isAdmin, (c) => product.getProduct(c));

products.get("/:slug", (c) => product.getProduct(c));

products.patch(
  "/:id",
  protect,
  isAdmin,
  zValidator("json", validation.partialProductSchema),
  (c) => product.updateProduct(c)
);
products.delete("/:id", protect, isAdmin, (c) => product.deleteProduct(c));

export default products;
