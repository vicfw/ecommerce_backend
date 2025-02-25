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
import * as anonCartSchema from "./schema/anonCarts";
import * as deliveryCostSchema from "./schema/deliveryCosts";
import * as ordersSchema from "./schema/orders";
import * as orderItemsSchema from "./schema/orderItems";
import * as categoriesSchema from "./schema/categories";
import * as brandsSchema from "./schema/brands";

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
    ...anonCartSchema,
    ...cartItemsSchema,
    ...deliveryCostSchema,
    ...ordersSchema,
    ...orderItemsSchema,
    ...categoriesSchema,
    ...brandsSchema,
  },
});
