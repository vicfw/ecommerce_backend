import { Hono } from "hono";
import { colorImage } from "../controllers";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";

const colorImageRouter = new Hono();

colorImageRouter.get("/", (c) => colorImage.getColorImages(c));
colorImageRouter.get("/:id", (c) => colorImage.getColorImageById(c));
colorImageRouter.post(
  "/",
  zValidator("json", validation.colorImageSchema),
  (c) => colorImage.createColorImage(c)
);
colorImageRouter.patch(
  "/:id",
  zValidator("json", validation.partialColorImageSchema),
  (c) => colorImage.updateColorImage(c)
);
colorImageRouter.delete("/:id", (c) => colorImage.deleteColorImage(c));

export default colorImageRouter;
