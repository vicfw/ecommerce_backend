ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_track_id" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_init_started_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_one_pending_reserved_per_user" ON "orders" ("user_id") WHERE "status" = 'pending' AND "inventory_status" = 'reserved';
