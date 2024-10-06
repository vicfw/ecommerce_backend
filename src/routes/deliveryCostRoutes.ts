import { Hono } from "hono";
import { deliveryCost } from "../controllers";
import { isAdmin, protect } from "../middlewares";

const deliveryCosts = new Hono();

deliveryCosts.get("/", (c) => deliveryCost.getDeliveryCost(c));

deliveryCosts.post("/", protect, isAdmin, (c) =>
  deliveryCost.createDeliveryCost(c)
);

export default deliveryCosts;
