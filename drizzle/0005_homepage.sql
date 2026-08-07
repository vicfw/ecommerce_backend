CREATE TABLE IF NOT EXISTS "homepage" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "homepage_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "homepage" ("sections")
SELECT '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "homepage" LIMIT 1);
