import { Hono } from "hono";
import { protect } from "../middlewares";
import { cart } from "../controllers";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";
import { anonProtect } from "../middlewares/authMiddleware";

const carts = new Hono();

carts.get("/", protect, (c) => cart.getCart(c));
carts.post("/", protect, zValidator("json", validation.cartSchema), (c) =>
  cart.createCart(c)
);
carts.delete("/", protect, (c) => cart.deleteCart(c));

carts.get("/length", protect, (c) => cart.cartLength(c));

// Anon Carts
carts.get("/anon", anonProtect, (c) => cart.getAnonCart(c));

carts.post("/anon", zValidator("json", validation.anonCartSchema), (c) =>
  cart.createAnonCart(c)
);

carts.get("/anon/length", anonProtect, (c) => cart.anonCartLength(c));

export default carts;
