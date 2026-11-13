import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { returnRequest } from "../controllers";
import { isAdmin, protect } from "../middlewares";
import { validation } from "../validation";

const returnRequests = new Hono();

returnRequests.get("/", protect, isAdmin, (c) =>
  returnRequest.getAdminReturnRequests(c)
);
returnRequests.post(
  "/",
  protect,
  zValidator("json", validation.createReturnRequestSchema),
  (c) => returnRequest.createReturnRequest(c)
);
returnRequests.get("/order/:orderId", protect, (c) =>
  returnRequest.getReturnRequestForOrder(c)
);
returnRequests.patch(
  "/:id",
  protect,
  isAdmin,
  zValidator("json", validation.updateReturnRequestSchema),
  (c) => returnRequest.updateAdminReturnRequest(c)
);

export default returnRequests;
