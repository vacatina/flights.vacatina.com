ALTER TYPE "public"."notification_event_type"
ADD VALUE IF NOT EXISTS 'visa_request_received';

CREATE TYPE "public"."visa_application_status" AS ENUM(
  'draft',
  'submitted',
  'under_review',
  'needs_information',
  'customer_contacted',
  'closed'
);

CREATE TYPE "public"."visa_document_type" AS ENUM(
  'passport_bio_page',
  'passport_photo',
  'national_id_front',
  'national_id_back',
  'additional'
);

CREATE TYPE "public"."visa_document_status" AS ENUM(
  'pending_upload',
  'uploaded',
  'upload_failed',
  'deletion_pending',
  'deleted'
);

CREATE TABLE "visa_applications" (
  "id" text PRIMARY KEY NOT NULL,
  "reference" text NOT NULL,
  "owner_user_id" text NOT NULL,
  "nationality_code" text NOT NULL,
  "destination_code" text NOT NULL,
  "visa_type_id" text NOT NULL,
  "provider_product_id" text,
  "visa_name" text NOT NULL,
  "entry_date" date,
  "traveler_count" integer DEFAULT 1 NOT NULL,
  "contact_email" text,
  "contact_phone" text,
  "status" "visa_application_status" DEFAULT 'draft' NOT NULL,
  "pricing_snapshot" jsonb DEFAULT null,
  "internal_notes" text,
  "submitted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "visa_applications_traveler_count_check"
    CHECK ("traveler_count" between 1 and 10)
);

CREATE TABLE "visa_application_travelers" (
  "id" text PRIMARY KEY NOT NULL,
  "application_id" text NOT NULL,
  "position" integer NOT NULL,
  "title" text NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "nationality_code" text NOT NULL,
  "date_of_birth" date NOT NULL,
  "passport_number" text NOT NULL,
  "passport_expiry_date" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "visa_application_travelers_position_check"
    CHECK ("position" between 0 and 9)
);

CREATE TABLE "visa_application_documents" (
  "id" text PRIMARY KEY NOT NULL,
  "application_id" text NOT NULL,
  "traveler_id" text NOT NULL,
  "document_type" "visa_document_type" NOT NULL,
  "status" "visa_document_status" DEFAULT 'pending_upload' NOT NULL,
  "object_key" text NOT NULL,
  "original_filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "etag" text,
  "uploaded_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "visa_application_documents_size_check"
    CHECK ("size_bytes" > 0 and "size_bytes" <= 10485760)
);

CREATE TABLE "visa_application_events" (
  "id" text PRIMARY KEY NOT NULL,
  "application_id" text NOT NULL,
  "actor_user_id" text,
  "event_type" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "visa_applications"
  ADD CONSTRAINT "visa_applications_owner_user_id_users_id_fk"
  FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "visa_application_travelers"
  ADD CONSTRAINT "visa_application_travelers_application_id_fk"
  FOREIGN KEY ("application_id")
  REFERENCES "public"."visa_applications"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "visa_application_documents"
  ADD CONSTRAINT "visa_application_documents_application_id_fk"
  FOREIGN KEY ("application_id")
  REFERENCES "public"."visa_applications"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "visa_application_documents"
  ADD CONSTRAINT "visa_application_documents_traveler_id_fk"
  FOREIGN KEY ("traveler_id")
  REFERENCES "public"."visa_application_travelers"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "visa_application_events"
  ADD CONSTRAINT "visa_application_events_application_id_fk"
  FOREIGN KEY ("application_id")
  REFERENCES "public"."visa_applications"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "visa_application_events"
  ADD CONSTRAINT "visa_application_events_actor_user_id_users_id_fk"
  FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX "visa_applications_reference_unique_idx"
  ON "visa_applications" USING btree ("reference");

CREATE INDEX "visa_applications_owner_updated_idx"
  ON "visa_applications" USING btree ("owner_user_id", "updated_at");

CREATE INDEX "visa_applications_status_submitted_idx"
  ON "visa_applications" USING btree ("status", "submitted_at");

CREATE UNIQUE INDEX
  "visa_application_travelers_application_position_unique_idx"
  ON "visa_application_travelers"
  USING btree ("application_id", "position");

CREATE INDEX "visa_application_travelers_application_idx"
  ON "visa_application_travelers" USING btree ("application_id");

CREATE INDEX "visa_application_documents_application_idx"
  ON "visa_application_documents"
  USING btree ("application_id", "created_at");

CREATE INDEX "visa_application_documents_traveler_idx"
  ON "visa_application_documents"
  USING btree ("traveler_id", "created_at");

CREATE UNIQUE INDEX "visa_application_documents_object_key_unique_idx"
  ON "visa_application_documents" USING btree ("object_key");

CREATE INDEX "visa_application_events_application_timeline_idx"
  ON "visa_application_events"
  USING btree ("application_id", "created_at");
