import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { usersTable } from "./schema/users";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_DRIZZLE,
});

export const db = drizzle({
  client: pool,
  schema: {
    users: usersTable,
  },
});
