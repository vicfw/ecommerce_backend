import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as userSchema from "./schema/users";
import * as addressSchema from "./schema/addresses";
import * as productsSchema from "./schema/products";
import * as badgesSchema from "./schema/badges";
import * as badgesToProductsSchema from "./schema/badgesToProducts";
import * as cartSchema from "./schema/carts";
import * as cartItemsSchema from "./schema/cartItems";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_DRIZZLE,
});

export const db = drizzle({
  client: pool,
  schema: {
    ...userSchema,
    ...addressSchema,
    ...productsSchema,
    ...badgesSchema,
    ...badgesToProductsSchema,
    ...cartSchema,
    ...cartItemsSchema,
  },
});
