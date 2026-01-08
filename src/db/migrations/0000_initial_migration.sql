CREATE TYPE "public"."compatibility_status" AS ENUM('verified', 'reported', 'untested', 'incompatible');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."protocol" AS ENUM('zigbee', 'zwave', 'matter', 'wifi', 'thread', 'bluetooth');--> statement-breakpoint
CREATE TYPE "public"."zwave_frequency" AS ENUM('us', 'eu', 'au', 'jp');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "device_compatibility" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"hub_id" integer NOT NULL,
	"integration_name" varchar(100),
	"status" "compatibility_status" DEFAULT 'untested' NOT NULL,
	"notes" text,
	"source" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "compat_unique" UNIQUE("product_id","hub_id","integration_name")
);
--> statement-breakpoint
CREATE TABLE "hubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"manufacturer_id" integer,
	"protocols_supported" jsonb DEFAULT '[]'::jsonb,
	"description" text,
	CONSTRAINT "hubs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "manufacturers" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"website" text,
	"logo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "manufacturers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"retailer_id" integer NOT NULL,
	"url" varchar(2048) NOT NULL,
	"affiliate_url" varchar(2048),
	"price" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"in_stock" boolean,
	"last_checked" timestamp
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"manufacturer_id" integer,
	"model" varchar(255),
	"category_id" integer,
	"primary_protocol" "protocol",
	"local_control" boolean,
	"cloud_dependent" boolean,
	"requires_hub" boolean,
	"matter_certified" boolean,
	"image_url" text,
	"description" text,
	"primary_source_id" integer,
	"manual_overrides" jsonb DEFAULT '{}'::jsonb,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "raw_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(50) NOT NULL,
	"source_id" varchar(255) NOT NULL,
	"data" jsonb NOT NULL,
	"checksum" varchar(64),
	"product_id" integer,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	CONSTRAINT "raw_imports_source_unique" UNIQUE("source","source_id")
);
--> statement-breakpoint
CREATE TABLE "retailers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255) NOT NULL,
	"affiliate_tag" varchar(255),
	"regions" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "zigbee_details" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"ieee_manufacturer" varchar(255),
	"model_id" varchar(255),
	"endpoints" jsonb,
	"exposes" jsonb
);
--> statement-breakpoint
CREATE TABLE "zwave_details" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"zwave_manufacturer_id" varchar(10),
	"product_type" varchar(10),
	"product_id_hex" varchar(10),
	"frequency" "zwave_frequency"
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_compatibility" ADD CONSTRAINT "device_compatibility_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_compatibility" ADD CONSTRAINT "device_compatibility_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_primary_source_id_raw_imports_id_fk" FOREIGN KEY ("primary_source_id") REFERENCES "public"."raw_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_imports" ADD CONSTRAINT "raw_imports_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zigbee_details" ADD CONSTRAINT "zigbee_details_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zwave_details" ADD CONSTRAINT "zwave_details_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compat_product_idx" ON "device_compatibility" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "compat_hub_idx" ON "device_compatibility" USING btree ("hub_id");--> statement-breakpoint
CREATE INDEX "prices_product_idx" ON "product_prices" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_manufacturer_idx" ON "products" USING btree ("manufacturer_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_protocol_idx" ON "products" USING btree ("primary_protocol");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "raw_imports_source_idx" ON "raw_imports" USING btree ("source");--> statement-breakpoint
CREATE INDEX "raw_imports_product_idx" ON "raw_imports" USING btree ("product_id");