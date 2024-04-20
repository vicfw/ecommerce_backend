import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { badge } from "../controllers";
import { protect } from "../middlewares";
import { validation } from "../validation";


const badges = new Hono()

badges.get("/", (c) => badge.getBadges(c))
badges.post("/", protect, zValidator("json", validation.badgesSchema), (c) => badge.createBadge(c))
badges.patch("/:id", protect, zValidator("json", validation.partialBadgeSchema), (c) => badge.updateBadge(c))
badges.delete("/:id", protect, (c) => badge.deleteBadge(c))


export default badges