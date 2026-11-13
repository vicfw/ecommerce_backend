CREATE TABLE IF NOT EXISTS "coupons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "coupons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" varchar(64) NOT NULL,
	"type" varchar(16) NOT NULL,
	"value" real NOT NULL,
	"min_cart" real,
	"expires_at" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "coupon_code" varchar(64);
--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "coupon_amount" real DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_code" varchar(64);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_amount" real DEFAULT 0;
