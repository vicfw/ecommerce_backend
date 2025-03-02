import { Hono } from "hono";
import { brand } from "../controllers";
import { protect } from "../middlewares";

const brands = new Hono();

brands.get("/", (c) => brand.getBrands(c));
brands.post("/", protect, (c) => brand.createBrand(c));
brands.delete("/:id", protect, (c) => brand.deleteBrand(c));
brands.patch("/:id", protect, (c) => brand.updateBrand(c));

export default brands;
