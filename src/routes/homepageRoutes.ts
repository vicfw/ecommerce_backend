import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { homepage } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { validation } from "../validation";

const homepageRoutes = new Hono();

homepageRoutes.get("/", (c) => homepage.getHomepage(c));

homepageRoutes.get("/admin", protect, isAdmin, (c) =>
  homepage.getHomepageAdmin(c)
);

homepageRoutes.put(
  "/",
  protect,
  isAdmin,
  zValidator("json", validation.updateHomepageSchema),
  (c) => homepage.updateHomepage(c)
);

export default homepageRoutes;
