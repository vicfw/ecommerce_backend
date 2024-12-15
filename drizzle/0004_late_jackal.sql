ALTER TABLE "anonCarts" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "anonCarts" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "anonCarts" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();--> statement-breakpoint
ALTER TABLE "anonCarts" ALTER COLUMN "id" SET NOT NULL;