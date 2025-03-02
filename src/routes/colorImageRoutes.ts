import { Hono } from "hono";
import { colorImage } from "../controllers";

const colorImages = new Hono();

colorImages.post("/", (c) => colorImage.createColorImage(c));

export default colorImages;
