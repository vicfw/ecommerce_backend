import { Hono } from "hono";
import { address } from "../controllers";
import { protect } from "../middlewares";
import { zValidator } from "@hono/zod-validator";
import { validation } from "../validation";
import { deleteAddressBulk } from "../controllers/addressControllers";

const addresses = new Hono();

addresses.get("/", protect, (c) => address.getAddress(c));

addresses.post(
  "/",
  protect,
  zValidator("json", validation.addressSchema),
  (c) => address.createAddress(c)
);

addresses.patch(
  "/:id",
  protect,
  zValidator("json", validation.addressSchemaPartial),
  (c) => address.updateAddress(c)
);

addresses.delete(
  "/:id",
  protect,
  zValidator("param", validation.deleteAddressSchema),
  (c) => address.deleteAddress(c)
);

addresses.delete(
  "/bulk",
  protect,
  zValidator("json", validation.deleteAddressBulkSchema),
  (c) => address.deleteAddressBulk(c)
);

export default addresses;
