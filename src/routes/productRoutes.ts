import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { validation } from "../validation";
import { product } from "../controllers";
import { protect } from "../middlewares";

const products = new Hono();

products.post(
  "/",
  protect,
  zValidator("json", validation.productsSchema),
  (c) => product.createProduct(c)
);
products.get("/", (c) => product.getProducts(c));
products.patch("/:id", (c) => product.updateProduct(c));
products.delete("/:id", (c) => product.deleteProduct(c));

export default products;
