import { Hono } from "hono";
import { payment } from "../controllers";
import { protect } from "../middlewares";
const payments = new Hono();

payments.post("/", protect, (c) => payment.paymentRequest(c));
payments.post("/verify", (c) => payment.verifyPayment(c));

export default payments;
