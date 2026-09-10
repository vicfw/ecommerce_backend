ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "reserved_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "inventory_status" varchar DEFAULT 'released';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "reservation_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
UPDATE "orders" SET "inventory_status" = 'deducted' WHERE "status" IN ('processing', 'shipped', 'delivered');--> statement-breakpoint
UPDATE "orders" SET "inventory_status" = 'released' WHERE "status" IN ('pending', 'cancelled', 'returned') OR "inventory_status" IS NULL;
