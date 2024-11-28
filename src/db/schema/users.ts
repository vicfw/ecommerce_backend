import {
  boolean,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  phoneNumber: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }),
  lastName: varchar({ length: 255 }),
  code: varchar({ length: 255 }).notNull().default("00000"),
  codeValidUntil: timestamp().notNull().defaultNow(),
  isAdmin: boolean().notNull().default(false),
  createdAtdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
  point: integer().notNull().default(0),
});
