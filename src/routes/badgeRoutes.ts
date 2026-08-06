import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { badge } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { validation } from "../validation";

const badges = new Hono();

badges.get("/", (c) => badge.getBadges(c));

// Admin routes (must be before /:id)
badges.get("/admin", protect, isAdmin, (c) => badge.getBadges(c));
badges.get("/admin/:id", protect, isAdmin, (c) => badge.getBadgeById(c));

badges.get("/:id", (c) => badge.getBadgeById(c));
badges.post(
  "/",
  protect,
  isAdmin,
  zValidator("json", validation.badgesSchema),
  (c) => badge.createBadge(c)
);
badges.patch(
  "/:id",
  protect,
  isAdmin,
  zValidator("json", validation.partialBadgeSchema),
  (c) => badge.updateBadge(c)
);
badges.delete("/:id", protect, isAdmin, (c) => badge.deleteBadge(c));

export default badges;
