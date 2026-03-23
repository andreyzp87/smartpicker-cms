CREATE TYPE "public"."compatibility_status" AS ENUM('verified', 'supported', 'reported', 'untested', 'incompatible');--> statement-breakpoint
CREATE TYPE "public"."compatibility_target_type" AS ENUM('integration', 'hub');--> statement-breakpoint
CREATE TYPE "public"."evidence_source" AS ENUM('zigbee2mqtt', 'blakadder', 'zwave_js', 'manual', 'imported_other');--> statement-breakpoint
CREATE TYPE "public"."hardware_requirement_type" AS ENUM('required', 'recommended', 'supported');--> statement-breakpoint
CREATE TYPE "public"."integration_kind" AS ENUM('protocol_stack', 'bridge', 'native_component', 'vendor_connector', 'addon', 'external_service');--> statement-breakpoint
CREATE TYPE "public"."merge_confidence" AS ENUM('exact', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."platform_kind" AS ENUM('open_platform', 'commercial_platform');--> statement-breakpoint
CREATE TYPE "public"."product_role" AS ENUM('endpoint', 'infrastructure');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."protocol" AS ENUM('zigbee', 'zwave', 'matter', 'wifi', 'thread', 'bluetooth', 'proprietary', 'multi');--> statement-breakpoint
CREATE TYPE "public"."review_state" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."support_type" AS ENUM('native', 'addon', 'external', 'community');--> statement-breakpoint
CREATE TYPE "public"."zwave_frequency" AS ENUM('us', 'eu', 'au', 'jp');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "commercial_hubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"manufacturer_id" integer,
	"website" text,
	"description" text,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_hubs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "compatibility_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_type" "compatibility_target_type" NOT NULL,
	"product_integration_compatibility_id" integer,
	"product_hub_compatibility_id" integer,
	"source" "evidence_source" NOT NULL,
	"source_record_key" text NOT NULL,
	"asserted_status" "compatibility_status" NOT NULL,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"imported_at" timestamp with time zone NOT NULL,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compatibility_evidence_unique" UNIQUE("source","source_record_key","product_integration_compatibility_id","product_hub_compatibility_id")
);
--> statement-breakpoint
CREATE TABLE "integration_hardware_support" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"requirement_type" "hardware_requirement_type" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_hardware_support_unique" UNIQUE("integration_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"integration_kind" "integration_kind" NOT NULL,
	"primary_protocol" "protocol",
	"manufacturer_id" integer,
	"website" text,
	"description" text,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integrations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "manufacturers" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"website" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manufacturers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform_id" integer NOT NULL,
	"integration_id" integer NOT NULL,
	"support_type" "support_type" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_integrations_unique" UNIQUE("platform_id","integration_id")
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"kind" "platform_kind" NOT NULL,
	"manufacturer_id" integer,
	"website" text,
	"description" text,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platforms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_hub_compatibility" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"hub_id" integer NOT NULL,
	"status" "compatibility_status" NOT NULL,
	"review_state" "review_state" DEFAULT 'pending' NOT NULL,
	"support_summary" text,
	"internal_notes" text,
	"canonical_source" "evidence_source" NOT NULL,
	"first_seen_at" timestamp with time zone,
	"last_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_hub_compatibility_unique" UNIQUE("product_id","hub_id")
);
--> statement-breakpoint
CREATE TABLE "product_integration_compatibility" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"integration_id" integer NOT NULL,
	"status" "compatibility_status" NOT NULL,
	"review_state" "review_state" DEFAULT 'pending' NOT NULL,
	"support_summary" text,
	"internal_notes" text,
	"canonical_source" "evidence_source" NOT NULL,
	"first_seen_at" timestamp with time zone,
	"last_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_integration_compatibility_unique" UNIQUE("product_id","integration_id")
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
	"last_checked" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"raw_import_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"merge_confidence" "merge_confidence" DEFAULT 'exact' NOT NULL,
	"merged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"merged_by" varchar(50) DEFAULT 'auto' NOT NULL,
	"notes" text,
	CONSTRAINT "product_sources_unique" UNIQUE("product_id","raw_import_id")
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
	"product_role" "product_role" DEFAULT 'endpoint' NOT NULL,
	"local_control" boolean,
	"cloud_dependent" boolean,
	"requires_hub" boolean,
	"matter_certified" boolean,
	"image_url" text,
	"description" text,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"primary_source_id" integer,
	"manual_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
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
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
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
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "source_compatibility_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(50) NOT NULL,
	"source_code" varchar(100) NOT NULL,
	"target_type" "compatibility_target_type" NOT NULL,
	"target_key" varchar(255) NOT NULL,
	"integration_id" integer,
	"hub_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_compatibility_mappings_unique" UNIQUE("source","source_code","target_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
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
ALTER TABLE "commercial_hubs" ADD CONSTRAINT "commercial_hubs_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_evidence" ADD CONSTRAINT "compatibility_evidence_product_integration_compatibility_id_product_integration_compatibility_id_fk" FOREIGN KEY ("product_integration_compatibility_id") REFERENCES "public"."product_integration_compatibility"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_evidence" ADD CONSTRAINT "compatibility_evidence_product_hub_compatibility_id_product_hub_compatibility_id_fk" FOREIGN KEY ("product_hub_compatibility_id") REFERENCES "public"."product_hub_compatibility"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_hardware_support" ADD CONSTRAINT "integration_hardware_support_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_hardware_support" ADD CONSTRAINT "integration_hardware_support_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_integrations" ADD CONSTRAINT "platform_integrations_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_integrations" ADD CONSTRAINT "platform_integrations_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platforms" ADD CONSTRAINT "platforms_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_hub_compatibility" ADD CONSTRAINT "product_hub_compatibility_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_hub_compatibility" ADD CONSTRAINT "product_hub_compatibility_hub_id_commercial_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."commercial_hubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_integration_compatibility" ADD CONSTRAINT "product_integration_compatibility_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_integration_compatibility" ADD CONSTRAINT "product_integration_compatibility_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sources" ADD CONSTRAINT "product_sources_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sources" ADD CONSTRAINT "product_sources_raw_import_id_raw_imports_id_fk" FOREIGN KEY ("raw_import_id") REFERENCES "public"."raw_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_primary_source_id_raw_imports_id_fk" FOREIGN KEY ("primary_source_id") REFERENCES "public"."raw_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_imports" ADD CONSTRAINT "raw_imports_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_compatibility_mappings" ADD CONSTRAINT "source_compatibility_mappings_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_compatibility_mappings" ADD CONSTRAINT "source_compatibility_mappings_hub_id_commercial_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."commercial_hubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zigbee_details" ADD CONSTRAINT "zigbee_details_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zwave_details" ADD CONSTRAINT "zwave_details_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commercial_hubs_manufacturer_idx" ON "commercial_hubs" USING btree ("manufacturer_id");--> statement-breakpoint
CREATE INDEX "commercial_hubs_status_idx" ON "commercial_hubs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "compatibility_evidence_integration_idx" ON "compatibility_evidence" USING btree ("product_integration_compatibility_id");--> statement-breakpoint
CREATE INDEX "compatibility_evidence_hub_idx" ON "compatibility_evidence" USING btree ("product_hub_compatibility_id");--> statement-breakpoint
CREATE INDEX "integration_hardware_support_integration_idx" ON "integration_hardware_support" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "integration_hardware_support_product_idx" ON "integration_hardware_support" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "integrations_manufacturer_idx" ON "integrations" USING btree ("manufacturer_id");--> statement-breakpoint
CREATE INDEX "integrations_protocol_idx" ON "integrations" USING btree ("primary_protocol");--> statement-breakpoint
CREATE INDEX "integrations_status_idx" ON "integrations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "platform_integrations_platform_idx" ON "platform_integrations" USING btree ("platform_id");--> statement-breakpoint
CREATE INDEX "platform_integrations_integration_idx" ON "platform_integrations" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "platforms_manufacturer_idx" ON "platforms" USING btree ("manufacturer_id");--> statement-breakpoint
CREATE INDEX "platforms_status_idx" ON "platforms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_hub_compatibility_product_idx" ON "product_hub_compatibility" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_hub_compatibility_hub_idx" ON "product_hub_compatibility" USING btree ("hub_id");--> statement-breakpoint
CREATE INDEX "product_integration_compatibility_product_idx" ON "product_integration_compatibility" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_integration_compatibility_integration_idx" ON "product_integration_compatibility" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "prices_product_idx" ON "product_prices" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_sources_product_idx" ON "product_sources" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_sources_raw_import_idx" ON "product_sources" USING btree ("raw_import_id");--> statement-breakpoint
CREATE INDEX "products_manufacturer_idx" ON "products" USING btree ("manufacturer_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_protocol_idx" ON "products" USING btree ("primary_protocol");--> statement-breakpoint
CREATE INDEX "products_role_idx" ON "products" USING btree ("product_role");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "raw_imports_source_idx" ON "raw_imports" USING btree ("source");--> statement-breakpoint
CREATE INDEX "raw_imports_product_idx" ON "raw_imports" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "source_compatibility_mappings_source_code_idx" ON "source_compatibility_mappings" USING btree ("source","source_code");--> statement-breakpoint
CREATE INDEX "source_compatibility_mappings_integration_idx" ON "source_compatibility_mappings" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "source_compatibility_mappings_hub_idx" ON "source_compatibility_mappings" USING btree ("hub_id");