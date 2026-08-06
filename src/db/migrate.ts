import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const migrationsFolder = path.join(import.meta.dir, "../../drizzle");

type JournalEntry = {
  tag: string;
  when: number;
};

const readJournalEntries = (): JournalEntry[] => {
  const journalPath = path.join(migrationsFolder, "meta/_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  return journal.entries as JournalEntry[];
};

const migrationHash = (tag: string) => {
  const sql = fs.readFileSync(path.join(migrationsFolder, `${tag}.sql`), "utf8");
  return crypto.createHash("sha256").update(sql).digest("hex");
};

const baselineExistingDatabase = async (client: pg.PoolClient) => {
  const ordersExists = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'orders'
    ) AS exists
  `);

  if (!ordersExists.rows[0]?.exists) {
    return false;
  }

  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const applied = await client.query(
    `SELECT COUNT(*)::int AS count FROM drizzle.__drizzle_migrations`
  );

  if (applied.rows[0]?.count > 0) {
    return false;
  }

  const entries = readJournalEntries();
  const baselineEntries = entries.slice(0, -1);

  if (baselineEntries.length === 0) {
    return false;
  }

  console.log(
    `Baselining existing database (${baselineEntries.length} migrations)...`
  );

  for (const entry of baselineEntries) {
    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      [migrationHash(entry.tag), entry.when]
    );
    console.log(`  marked as applied: ${entry.tag}`);
  }

  return true;
};

const run = async () => {
  const connectionString = process.env.DATABASE_URL_DRIZZLE;

  if (!connectionString) {
    throw new Error("DATABASE_URL_DRIZZLE is not set");
  }

  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  try {
    await baselineExistingDatabase(client);
  } finally {
    client.release();
  }

  const db = drizzle(pool);

  console.log("Applying pending migrations...");
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");

  await pool.end();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
