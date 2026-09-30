CREATE TYPE "public"."visa_listing_status" AS ENUM('draft', 'published');
CREATE TYPE "public"."visa_listing_document_scope" AS ENUM(
  'per_traveler', 'per_application'
);

CREATE TABLE "visa_listings" (
  "id" text PRIMARY KEY NOT NULL,
  "nationality_code" text NOT NULL,
  "destination_code" text NOT NULL,
  "code" text NOT NULL,
  "title" text DEFAULT '' NOT NULL,
  "short_summary" text DEFAULT '' NOT NULL,
  "full_description" text DEFAULT '' NOT NULL,
  "eligibility_notes" text,
  "processing_time_text" text,
  "validity_text" text,
  "max_stay_text" text,
  "entries_text" text,
  "passport_validity_text" text,
  "additional_notes" text,
  "fee_currency" text,
  "government_fee_minor" numeric(30, 0),
  "processing_fee_minor" numeric(30, 0),
  "status" "visa_listing_status" DEFAULT 'draft' NOT NULL,
  "documents_reviewed" boolean DEFAULT false NOT NULL,
  "published_at" timestamp with time zone,
  "reviewed_at" timestamp with time zone,
  "created_by" text,
  "updated_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "visa_listings_nationality_check"
    CHECK ("nationality_code" ~ '^[A-Z]{2}$'),
  CONSTRAINT "visa_listings_destination_check"
    CHECK ("destination_code" ~ '^[A-Z]{2}$'
      AND "destination_code" <> "nationality_code"),
  CONSTRAINT "visa_listings_code_check"
    CHECK ("code" ~ '^[A-Z0-9_-]{2,40}$'),
  CONSTRAINT "visa_listings_currency_check"
    CHECK ("fee_currency" IS NULL OR "fee_currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "visa_listings_fees_check"
    CHECK (("government_fee_minor" IS NULL OR "government_fee_minor" >= 0)
      AND ("processing_fee_minor" IS NULL OR "processing_fee_minor" >= 0))
);

CREATE TABLE "visa_listing_documents" (
  "id" text PRIMARY KEY NOT NULL,
  "listing_id" text NOT NULL,
  "label" text NOT NULL,
  "instructions" text,
  "required" boolean DEFAULT true NOT NULL,
  "scope" "visa_listing_document_scope" NOT NULL,
  "sort_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "visa_listing_documents_sort_order_check"
    CHECK ("sort_order" >= 0),
  CONSTRAINT "visa_listing_documents_label_check"
    CHECK (length(trim("label")) > 0)
);

ALTER TABLE "visa_listings"
  ADD CONSTRAINT "visa_listings_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;
ALTER TABLE "visa_listings"
  ADD CONSTRAINT "visa_listings_updated_by_users_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;
ALTER TABLE "visa_listing_documents"
  ADD CONSTRAINT "visa_listing_documents_listing_id_visa_listings_id_fk"
  FOREIGN KEY ("listing_id") REFERENCES "public"."visa_listings"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "visa_listings_route_code_unique_idx"
  ON "visa_listings" USING btree (
    "nationality_code", "destination_code", "code"
  );
CREATE INDEX "visa_listings_public_route_idx"
  ON "visa_listings" USING btree (
    "status", "nationality_code", "destination_code"
  );
CREATE UNIQUE INDEX "visa_listing_documents_order_unique_idx"
  ON "visa_listing_documents" USING btree ("listing_id", "sort_order");
