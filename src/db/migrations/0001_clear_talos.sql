CREATE TYPE "public"."merge_confidence" AS ENUM('exact', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TABLE "product_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"raw_import_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"merge_confidence" "merge_confidence" DEFAULT 'exact' NOT NULL,
	"merged_at" timestamp DEFAULT now() NOT NULL,
	"merged_by" varchar(50) DEFAULT 'auto' NOT NULL,
	"notes" text,
	CONSTRAINT "product_sources_unique" UNIQUE("product_id","raw_import_id")
);
--> statement-breakpoint
ALTER TABLE "product_sources" ADD CONSTRAINT "product_sources_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sources" ADD CONSTRAINT "product_sources_raw_import_id_raw_imports_id_fk" FOREIGN KEY ("raw_import_id") REFERENCES "public"."raw_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_sources_product_idx" ON "product_sources" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_sources_raw_import_idx" ON "product_sources" USING btree ("raw_import_id");