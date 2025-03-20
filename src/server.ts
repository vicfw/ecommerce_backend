import { v2 as cloudinary } from "cloudinary";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { errorHandler, notFound } from "./middlewares";
import { limiter } from "./middlewares/rateLimitMiddleware";
import {
  addressRoutes,
  badgesRoutes,
  brandRoutes,
  cartRoutes,
  categoryRoutes,
  colorImageRoutes,
  deliveryCostRoutes,
  orderRoutes,
  paymentRoutes,
  productRoutes,
  uploadRoutes,
  userRoutes,
  commentRoutes,
} from "./routes";

const app = new Hono().basePath("/api/v1");

app.use("*", logger(), prettyJSON());

// Cors
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

// Rate Limiter
app.use("*", limiter);

// User Routes
app.route("/users", userRoutes);
app.route("/address", addressRoutes);
app.route("/category", categoryRoutes);
app.route("/brand", brandRoutes);
app.route("/product", productRoutes);
app.route("/order", orderRoutes);
app.route("/upload", uploadRoutes);
app.route("/badge", badgesRoutes);
app.route("/cart", cartRoutes);
app.route("/deliveryCost", deliveryCostRoutes);
app.route("/payment", paymentRoutes);
app.route("/colorImage", colorImageRoutes);
app.route("/comment", commentRoutes);

cloudinary.config({
  cloud_name: Bun.env.CLOUDINARY_CLOUD_NAME,
  api_key: Bun.env.CLOUDINARY_API_KEY,
  api_secret: Bun.env.CLOUDINARY_API_SECRET,
});

// Error Handler
app.onError((_, c) => {
  const error = errorHandler(c);
  return error;
});

// Not Found Handler
app.notFound((c) => {
  const error = notFound(c);
  return error;
});

const port = parseInt(Bun.env.PORT!) || 3000;
console.log(`Running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
