import { v2 as cloudinary } from "cloudinary";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { pinoLogger } from "hono-pino";
import { logger } from "./lib/logger";
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
  adminRoutes,
  homepageRoutes,
  siteSettingsRoutes,
} from "./routes";
import { expireStaleReservations } from "./utils/inventory";

const app = new Hono().basePath("/api/v1");

app.use(
  "*",
  pinoLogger({
    pino: logger,
    nodeRuntime: true,
    http: {
      reqId: () => crypto.randomUUID(),
      onReqBindings: (c) => ({
        req: {
          url: c.req.path,
          method: c.req.method,
        },
      }),
      onResBindings: (c) => ({
        res: {
          status: c.res.status,
        },
      }),
      onResLevel: (c) => {
        const status = c.res.status;
        if (status >= 500) return "error";
        if (status >= 400 && status !== 404) return "warn";
        return "info";
      },
    },
  }),
);
app.use("*", prettyJSON());

// Cors
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
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
app.route("/admin", adminRoutes);
app.route("/homepage", homepageRoutes);
app.route("/site-settings", siteSettingsRoutes);

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
logger.info({ port }, "server_started");

const EXPIRY_INTERVAL_MS = 60_000;

const globalForInventory = globalThis as typeof globalThis & {
  inventoryExpiryInterval?: ReturnType<typeof setInterval>;
};

if (globalForInventory.inventoryExpiryInterval) {
  clearInterval(globalForInventory.inventoryExpiryInterval);
}

globalForInventory.inventoryExpiryInterval = setInterval(() => {
  expireStaleReservations().catch((err) => {
    logger.error({ err }, "expire_stale_reservations_failed");
  });
}, EXPIRY_INTERVAL_MS);

export default {
  port,
  fetch: app.fetch,
};
