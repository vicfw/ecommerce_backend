CREATE TABLE IF NOT EXISTS "anonCarts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "anonCarts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"price" real NOT NULL,
	"profit_from_discount" integer DEFAULT 0,
	"total_discount_percentage" integer DEFAULT 0,
	"discount_price" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"delivery_cost_id" integer NOT NULL,
	"userId" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart_items" ALTER COLUMN "cart_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "anon_cart_id" varchar(255);