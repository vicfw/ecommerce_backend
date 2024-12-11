CREATE TABLE IF NOT EXISTS "addresses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "addresses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"address" varchar(255) NOT NULL,
	"street" varchar(255) NOT NULL,
	"city" varchar(255) NOT NULL,
	"province" varchar(255) NOT NULL,
	"plate" varchar(255) NOT NULL,
	"floor" varchar(255) NOT NULL,
	"zipCode" varchar(255) NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"receiverName" varchar(255) NOT NULL,
	"receiverLastName" varchar(255) NOT NULL,
	"receiverPhoneNumber" varchar(255) NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "badges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "badges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"icon" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "badges_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "badges_to_products" (
	"badge_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	CONSTRAINT "badges_to_products_badge_id_product_id_pk" PRIMARY KEY("badge_id","product_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pr_name" varchar(255) DEFAULT 'محصول 1',
	"en_name" varchar(255) DEFAULT 'product 1',
	"slug" varchar(255) DEFAULT '1-product-1',
	"price" double precision,
	"discount" double precision DEFAULT 0,
	"weight" double precision DEFAULT 0,
	"description" text,
	"quantity" integer,
	"images" text[],
	"point" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"phoneNumber" varchar(255) NOT NULL,
	"name" varchar(255),
	"lastName" varchar(255),
	"code" varchar(255) DEFAULT '00000' NOT NULL,
	"codeValidUntil" timestamp DEFAULT now() NOT NULL,
	"isAdmin" boolean DEFAULT false NOT NULL,
	"createdAtdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"point" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "users_phoneNumber_unique" UNIQUE("phoneNumber")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "badges_to_products" ADD CONSTRAINT "badges_to_products_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "badges_to_products" ADD CONSTRAINT "badges_to_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
