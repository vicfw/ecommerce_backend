ALTER TABLE "anonCarts" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "anonCarts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "anonCarts" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "anonCarts" DROP COLUMN IF EXISTS "userId";