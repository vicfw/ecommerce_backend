import { Hono } from "hono";
import { colorImage } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";

const colorImageRouter = new Hono();

colorImageRouter.get("/", (c) => colorImage.getColorImages(c));

// Admin routes (must be before /:id)
colorImageRouter.get("/admin", protect, isAdmin, (c) =>
  colorImage.getColorImages(c)
);
colorImageRouter.get("/admin/:id", protect, isAdmin, (c) =>
  colorImage.getColorImageById(c)
);

colorImageRouter.get("/:id", (c) => colorImage.getColorImageById(c));
colorImageRouter.post(
  "/",
  protect,
  isAdmin,
  zValidator("json", validation.colorImageSchema),
  (c) => colorImage.createColorImage(c)
);
colorImageRouter.patch(
  "/:id",
  protect,
  isAdmin,
  zValidator("json", validation.partialColorImageSchema),
  (c) => colorImage.updateColorImage(c)
);
colorImageRouter.delete("/:id", protect, isAdmin, (c) =>
  colorImage.deleteColorImage(c)
);

export default colorImageRouter;
