CREATE TABLE "visa_listing_events" (
  "id" text PRIMARY KEY NOT NULL,
  "listing_id" text NOT NULL,
  "actor_user_id" text,
  "event_type" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "visa_listing_events_type_check"
    CHECK ("event_type" IN ('created', 'updated', 'published', 'unpublished'))
);

ALTER TABLE "visa_listing_events"
  ADD CONSTRAINT "visa_listing_events_listing_id_visa_listings_id_fk"
  FOREIGN KEY ("listing_id") REFERENCES "public"."visa_listings"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "visa_listing_events"
  ADD CONSTRAINT "visa_listing_events_actor_user_id_users_id_fk"
  FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

CREATE INDEX "visa_listing_events_timeline_idx"
  ON "visa_listing_events" USING btree ("listing_id", "created_at");
