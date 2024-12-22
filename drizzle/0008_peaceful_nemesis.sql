CREATE TABLE IF NOT EXISTS "order_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"price" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"address_id" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"profit_from_discount" real DEFAULT 0,
	"status" varchar DEFAULT 'processing',
	"delivery_amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "anonCarts" ALTER COLUMN "discount_price" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "profit_from_discount" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "discount_price" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "delivery_costs" ALTER COLUMN "cost" SET DATA TYPE real;