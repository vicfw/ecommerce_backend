import { Hono } from "hono";
import { brand } from "../controllers";
import { protect } from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";

const brands = new Hono();

brands.get("/", (c) => brand.getBrands(c));
brands.get("/:slug/products", (c) => brand.getProductsByBrandSlug(c));
brands.get("/:id", (c) => brand.getBrandById(c));
brands.post("/", protect, zValidator("json", validation.brandSchema), (c) =>
  brand.createBrand(c)
);
brands.delete("/:id", protect, (c) => brand.deleteBrand(c));
brands.patch(
  "/:id",
  protect,
  zValidator("json", validation.partialBrandSchema),
  (c) => brand.updateBrand(c)
);

export default brands;
