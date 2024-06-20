import { Hono } from "hono";
import { protect } from "../middlewares";
import { cart } from "../controllers";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";

const carts = new Hono();

carts.get("/", protect, (c) => cart.getCart(c));
carts.post("/", protect, zValidator("json", validation.cartSchema), (c) =>
  cart.createCart(c)
);
carts.delete("/", protect, (c) => cart.deleteCart(c));

carts.get("/length", protect, (c) => cart.cartLength(c));

export default carts;
