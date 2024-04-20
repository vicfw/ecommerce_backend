import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { validation } from "../validation"
import { color } from "../controllers"
import { protect } from "../middlewares"


const colors = new Hono()

colors.get("/", (c) => color.getColors(c))
colors.post("/", protect, zValidator("json", validation.colorsSchema), (c) => color.createColor(c))
colors.patch("/:id", protect, zValidator("json", validation.partialColorSchema), (c) => color.updateColor(c))
colors.delete("/:id", protect, (c) => color.deleteColor(c))


export default colors