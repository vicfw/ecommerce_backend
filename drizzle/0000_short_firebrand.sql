CREATE TYPE "public"."status" AS ENUM('pending', 'processing', 'shipped', 'returned', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE "addresses" (
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
CREATE TABLE "anonCarts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "anonCarts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"price" real NOT NULL,
	"profit_from_discount" integer DEFAULT 0,
	"total_discount_percentage" integer DEFAULT 0,
	"discount_price" real DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"delivery_cost_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "badges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"icon" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "badges_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "badges_to_products" (
	"badge_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	CONSTRAINT "badges_to_products_badge_id_product_id_pk" PRIMARY KEY("badge_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "colors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "colors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"image" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cart_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"quantity" integer NOT NULL,
	"item_price" real NOT NULL,
	"product_id" integer NOT NULL,
	"cart_id" integer,
	"anon_cart_id" varchar(255),
	"color_image_id" integer
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "carts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"price" real NOT NULL,
	"profit_from_discount" real DEFAULT 0,
	"total_discount_percentage" integer DEFAULT 0,
	"discount_price" real DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"delivery_cost_id" integer NOT NULL,
	"userId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"image" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "color_image" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "color_image_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"images" text[] NOT NULL,
	"color_image" text NOT NULL,
	"name" text NOT NULL,
	"product_id" integer
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"body" text NOT NULL,
	"image" text NOT NULL,
	"isApproved" boolean DEFAULT false,
	"productId" integer,
	"userId" integer,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "delivery_costs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "delivery_costs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"cost" real NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"price" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
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
CREATE TABLE "products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pr_name" varchar(255) DEFAULT 'محصول 1',
	"en_name" varchar(255) DEFAULT 'product 1',
	"slug" varchar(255) DEFAULT '1-product-1',
	"price" double precision NOT NULL,
	"discount" double precision DEFAULT 0,
	"weight" double precision DEFAULT 0,
	"description" text,
	"quantity" integer NOT NULL,
	"images" text[],
	"point" integer DEFAULT 0,
	"categoryId" integer NOT NULL,
	"brandId" integer,
	"defaultColorImage" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
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
ALTER TABLE "badges_to_products" ADD CONSTRAINT "badges_to_products_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badges_to_products" ADD CONSTRAINT "badges_to_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "color_image" ADD CONSTRAINT "color_image_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;