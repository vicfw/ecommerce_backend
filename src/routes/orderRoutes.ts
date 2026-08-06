import { Hono } from "hono";
import { order } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";

const orders = new Hono();

orders.post("/", protect, (c) => order.createOrder(c));
orders.get("/", protect, (c) => order.getOrders(c));
orders.get("/statusCount", protect, (c) => order.getStatusCount(c));

// Admin routes (must be before /:id)
orders.get("/admin", protect, isAdmin, (c) => order.getAdminOrders(c));
orders.get("/admin/:id", protect, isAdmin, (c) => order.getAdminOrder(c));
orders.patch(
  "/admin/:id/status",
  protect,
  isAdmin,
  zValidator("json", validation.updateOrderStatusSchema),
  (c) => order.updateAdminOrderStatus(c)
);

orders.get("/:id", protect, (c) => order.getOrder(c));

export default orders;
