import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const siteSettingsTable = pgTable("site_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  siteName: text("site_name").notNull().default(""),
  logoUrl: text("logo_url"),
  logoAlt: text("logo_alt"),
  faviconUrl: text("favicon_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SiteSettings = typeof siteSettingsTable.$inferSelect;
