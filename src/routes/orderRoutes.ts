import { Hono } from "hono";
import { order } from "../controllers";
import { protect } from "../middlewares";

const orders = new Hono();

orders.post("/", protect, (c) => order.createOrder(c));

export default orders;
