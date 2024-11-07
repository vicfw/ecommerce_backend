import { Hono } from "hono";
import { payment } from "../controllers";
const payments = new Hono();

payments.post("/", (c) => payment.paymentRequest(c));
payments.post("/verify", (c) => payment.verifyPayment(c));

export default payments;
