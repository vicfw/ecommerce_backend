ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_phone" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_phone_code" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_phone_code_valid_until" timestamp;
