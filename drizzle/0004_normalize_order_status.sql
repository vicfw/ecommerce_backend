-- Normalize legacy uppercase order statuses to lowercase enum values
UPDATE "orders" SET "status" = LOWER("status") WHERE "status" IS NOT NULL;--> statement-breakpoint
UPDATE "orders" SET "status" = 'delivered' WHERE "status" = 'completed';--> statement-breakpoint
UPDATE "orders" SET "status" = 'cancelled' WHERE "status" IN ('canceled', 'cancelled');--> statement-breakpoint
UPDATE "orders" SET "status" = 'pending' WHERE "status" NOT IN ('pending', 'processing', 'shipped', 'returned', 'delivered', 'cancelled');
