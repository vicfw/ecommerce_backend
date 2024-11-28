import {
  boolean,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const addressesTable = pgTable("addresses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  address: varchar({ length: 255 }).notNull(),
  street: varchar({ length: 255 }).notNull(),
  city: varchar({ length: 255 }).notNull(),
  province: varchar({ length: 255 }).notNull(),
  plate: varchar({ length: 255 }).notNull(),
  floor: varchar({ length: 255 }).notNull(),
  zipCode: varchar({ length: 255 }).notNull(),
  isDefault: boolean().notNull().default(false),
  receiverName: varchar({ length: 255 }).notNull(),
  receiverLastName: varchar({ length: 255 }).notNull(),
  receiverPhoneNumber: varchar({ length: 255 }).notNull(),

  userId: integer().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});
