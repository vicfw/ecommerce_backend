import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { siteSettings } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { validation } from "../validation";

const siteSettingsRoutes = new Hono();

siteSettingsRoutes.get("/", (c) => siteSettings.getSiteSettings(c));

siteSettingsRoutes.get("/admin", protect, isAdmin, (c) =>
  siteSettings.getSiteSettingsAdmin(c)
);

siteSettingsRoutes.put(
  "/",
  protect,
  isAdmin,
  zValidator("json", validation.updateSiteSettingsSchema),
  (c) => siteSettings.updateSiteSettings(c)
);

export default siteSettingsRoutes;
