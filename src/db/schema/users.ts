import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { addressesTable } from "./addresses";
import { commentsTable } from "./comments";

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

export const userRelations = relations(usersTable, ({ many }) => ({
  addresses: many(addressesTable),
  comments: many(commentsTable),
}));
