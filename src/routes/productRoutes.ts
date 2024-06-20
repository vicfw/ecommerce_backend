import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { product } from "../controllers";
import { protect } from "../middlewares";
import { validation } from "../validation";

const products = new Hono();

products.post("/", protect, zValidator("json", validation.productSchema), (c) =>
  product.createProduct(c)
);
products.get("/", (c) => product.getProducts(c));

// development routes
products.get("/seed", protect, (c) => product.seedProductsData(c));

products.get("/:slug", (c) => product.getProduct(c));

products.patch(
  "/:id",
  protect,
  zValidator("json", validation.partialProductSchema),
  (c) => product.updateProduct(c)
);
products.delete("/:id", protect, (c) => product.deleteProduct(c));

export default products;
