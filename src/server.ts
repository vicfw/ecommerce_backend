import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { errorHandler, notFound, protect } from "./middlewares";
import {
  UserRoutes,
  addressRoutes,
  badgesRoutes,
  cartRoutes,
  categoryRoutes,
  colorRoutes,
  orderRoutes,
  productRoutes,
  uploadRoutes,
} from "./routes";
import { v2 as cloudinary } from "cloudinary";
import { limiter } from "./middlewares/rateLimitMiddleware";

const app = new Hono().basePath("/api/v1");

app.use("*", logger(), prettyJSON());

app.use("/api/*", cors());

// Cors
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Rate Limiter
app.use("*", limiter);

// User Routes
app.route("/users", UserRoutes);
app.route("/address", addressRoutes);
app.route("/category", categoryRoutes);
app.route("/product", productRoutes);
app.route("/order", orderRoutes);
app.route("/upload", uploadRoutes);
app.route("/color", colorRoutes);
app.route("/badge", badgesRoutes);
app.route("/cart", cartRoutes);

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
