CREATE TYPE "public"."status" AS ENUM('pending', 'processing', 'shipped', 'returned', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brands" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brands_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"image" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"image" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "categoryId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brandId" integer DEFAULT 1 NOT NULL;