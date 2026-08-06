import { Hono } from "hono";
import { brand } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";

const brands = new Hono();

brands.get("/", (c) => brand.getBrands(c));

// Admin routes (must be before /:id and /:slug/products)
brands.get("/admin", protect, isAdmin, (c) => brand.getBrands(c));
brands.get("/admin/:id", protect, isAdmin, (c) => brand.getBrandById(c));

brands.get("/:slug/products", (c) => brand.getProductsByBrandSlug(c));
brands.get("/:id", (c) => brand.getBrandById(c));
brands.post(
  "/",
  protect,
  isAdmin,
  zValidator("json", validation.brandSchema),
  (c) => brand.createBrand(c)
);
brands.delete("/:id", protect, isAdmin, (c) => brand.deleteBrand(c));
brands.patch(
  "/:id",
  protect,
  isAdmin,
  zValidator("json", validation.partialBrandSchema),
  (c) => brand.updateBrand(c)
);

export default brands;
