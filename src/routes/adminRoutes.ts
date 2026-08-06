import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { adminLogin, adminRequestOtp, getDashboard } from "../controllers/adminControllers";
import { isAdmin, protect } from "../middlewares";
import { validation } from "../validation";

const adminRoutes = new Hono();

adminRoutes.post(
  "/request-otp",
  zValidator("json", validation.adminRequestOtpSchema),
  (c) => adminRequestOtp(c)
);

adminRoutes.post(
  "/login",
  zValidator("json", validation.adminLoginSchema),
  (c) => adminLogin(c)
);

adminRoutes.get("/dashboard", protect, isAdmin, (c) => getDashboard(c));

export default adminRoutes;
