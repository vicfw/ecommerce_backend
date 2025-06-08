import { Hono } from "hono";
import {
  createColorImage,
  updateColorImageProductId,
} from "../controllers/colorImageControllers";

const colorImageRouter = new Hono();

colorImageRouter.post("/", createColorImage);
colorImageRouter.patch("/:id", updateColorImageProductId);

export default colorImageRouter;
