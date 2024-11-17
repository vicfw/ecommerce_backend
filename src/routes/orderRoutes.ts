import { Hono } from "hono";
import { order } from "../controllers";
import { protect } from "../middlewares";

const orders = new Hono();

orders.post("/", protect, (c) => order.createOrder(c));
orders.get("/", protect, (c) => order.getOrders(c));
orders.get("/statusCount", protect, (c) => order.getStatusCount(c));
orders.get("/:id", protect, (c) => order.getOrder(c));

export default orders;
