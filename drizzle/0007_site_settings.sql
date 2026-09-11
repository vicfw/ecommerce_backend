CREATE TABLE IF NOT EXISTS "site_settings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "site_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"site_name" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"logo_alt" text,
	"favicon_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
INSERT INTO "site_settings" ("site_name")
SELECT ''
WHERE NOT EXISTS (SELECT 1 FROM "site_settings" LIMIT 1);
