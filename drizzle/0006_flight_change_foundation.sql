CREATE TYPE "public"."flight_change_request_type" AS ENUM('itinerary_change','add_baggage','remove_passenger','seat_change','remove_service','traveller_details_change','other');
CREATE TYPE "public"."flight_change_handling_mode" AS ENUM('automatic','admin_approval','manual');
CREATE TYPE "public"."flight_change_pricing_direction" AS ENUM('unknown','additional_payment','no_difference','customer_refund');
CREATE TYPE "public"."flight_change_status" AS ENUM('requested','searching','offers_ready','pending_change_ready','payment_pending','payment_processing','payment_captured','admin_review_required','duffel_confirming','refund_pending','manual_processing','reconciliation_required','completed','rejected','expired','failed');
CREATE TYPE "public"."flight_change_event_actor_type" AS ENUM('customer','guest','admin','system');

ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'change_request_received';
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'change_offers_ready';
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'change_payment_required';
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'change_payment_received';
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'change_admin_review';
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'change_approved';
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'change_rejected';
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'change_manual_processing';
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'change_completed';
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'change_refund_approved';
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'change_refund_completed';
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'change_issue';

CREATE TABLE "flight_change_requests" (
  "id" text PRIMARY KEY NOT NULL, "flight_order_id" text NOT NULL, "booking_reference" text NOT NULL,
  "duffel_order_id" text NOT NULL, "requested_by_user_id" text, "requested_by_guest_id" text,
  "request_type" "flight_change_request_type" NOT NULL, "handling_mode" "flight_change_handling_mode" NOT NULL,
  "status" "flight_change_status" DEFAULT 'requested' NOT NULL, "customer_reason" text NOT NULL,
  "selected_passenger_ids" jsonb DEFAULT '[]'::jsonb NOT NULL, "selected_slice_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "requested_change" jsonb, "pricing_direction" "flight_change_pricing_direction" DEFAULT 'unknown' NOT NULL,
  "additional_payment_amount" numeric(14,4), "customer_refund_amount" numeric(14,4), "currency" text,
  "payment_attempt_id" text, "change_approved_by" text, "change_approved_at" timestamptz,
  "refund_approved_by" text, "refund_approved_at" timestamptz, "admin_rejection_reason" text,
  "customer_message" text, "manual_external_reference" text, "manual_completion_notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE "flight_change_searches" (
  "id" text PRIMARY KEY NOT NULL, "change_request_id" text NOT NULL, "duffel_order_change_request_id" text NOT NULL,
  "removed_slice_ids" jsonb NOT NULL, "add_criteria" jsonb NOT NULL, "raw_payload" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE "flight_change_offers" (
  "id" text PRIMARY KEY NOT NULL, "change_request_id" text NOT NULL, "duffel_order_change_offer_id" text NOT NULL,
  "change_total_amount" numeric(14,4) NOT NULL, "change_total_currency" text NOT NULL,
  "new_total_amount" numeric(14,4), "new_total_currency" text, "penalty_amount" numeric(14,4),
  "penalty_currency" text, "refund_to" text, "expires_at" timestamptz NOT NULL, "selected_at" timestamptz,
  "summary_snapshot" jsonb, "raw_payload" jsonb, "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE "flight_order_changes" (
  "id" text PRIMARY KEY NOT NULL, "change_request_id" text NOT NULL, "duffel_order_change_id" text NOT NULL,
  "duffel_order_change_offer_id" text NOT NULL, "change_total_amount" numeric(14,4) NOT NULL,
  "change_total_currency" text NOT NULL, "new_total_amount" numeric(14,4) NOT NULL, "new_total_currency" text NOT NULL,
  "penalty_total_amount" numeric(14,4), "penalty_total_currency" text, "refund_to" text,
  "expires_at" timestamptz NOT NULL, "confirmed_at" timestamptz, "raw_payload" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE "flight_change_events" (
  "id" text PRIMARY KEY NOT NULL, "change_request_id" text NOT NULL,
  "actor_type" "flight_change_event_actor_type" NOT NULL, "actor_id" text, "event_type" text NOT NULL,
  "message" text, "metadata" jsonb, "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "flight_change_requests" ADD CONSTRAINT "flight_change_requests_order_fk" FOREIGN KEY ("flight_order_id") REFERENCES "flight_orders"("id") ON DELETE CASCADE;
ALTER TABLE "flight_change_requests" ADD CONSTRAINT "flight_change_requests_user_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "flight_change_requests" ADD CONSTRAINT "flight_change_requests_guest_fk" FOREIGN KEY ("requested_by_guest_id") REFERENCES "guest_sessions"("id") ON DELETE SET NULL;
ALTER TABLE "flight_change_requests" ADD CONSTRAINT "flight_change_requests_payment_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE SET NULL;
ALTER TABLE "flight_change_requests" ADD CONSTRAINT "flight_change_requests_change_admin_fk" FOREIGN KEY ("change_approved_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "flight_change_requests" ADD CONSTRAINT "flight_change_requests_refund_admin_fk" FOREIGN KEY ("refund_approved_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "flight_change_searches" ADD CONSTRAINT "flight_change_searches_request_fk" FOREIGN KEY ("change_request_id") REFERENCES "flight_change_requests"("id") ON DELETE CASCADE;
ALTER TABLE "flight_change_offers" ADD CONSTRAINT "flight_change_offers_request_fk" FOREIGN KEY ("change_request_id") REFERENCES "flight_change_requests"("id") ON DELETE CASCADE;
ALTER TABLE "flight_order_changes" ADD CONSTRAINT "flight_order_changes_request_fk" FOREIGN KEY ("change_request_id") REFERENCES "flight_change_requests"("id") ON DELETE CASCADE;
ALTER TABLE "flight_change_events" ADD CONSTRAINT "flight_change_events_request_fk" FOREIGN KEY ("change_request_id") REFERENCES "flight_change_requests"("id") ON DELETE CASCADE;

CREATE INDEX "flight_change_requests_order_lookup_idx" ON "flight_change_requests" ("flight_order_id","created_at");
CREATE INDEX "flight_change_requests_booking_lookup_idx" ON "flight_change_requests" ("booking_reference","created_at");
CREATE INDEX "flight_change_requests_status_queue_idx" ON "flight_change_requests" ("status","updated_at");
CREATE INDEX "flight_change_requests_mode_queue_idx" ON "flight_change_requests" ("handling_mode","status","updated_at");
CREATE INDEX "flight_change_requests_requester_lookup_idx" ON "flight_change_requests" ("requested_by_user_id","requested_by_guest_id","created_at");
CREATE UNIQUE INDEX "flight_change_requests_one_active_order_idx" ON "flight_change_requests" ("flight_order_id") WHERE "status" NOT IN ('completed','rejected','expired');
CREATE INDEX "flight_change_searches_request_timeline_idx" ON "flight_change_searches" ("change_request_id","created_at");
CREATE UNIQUE INDEX "flight_change_searches_duffel_request_unique_idx" ON "flight_change_searches" ("duffel_order_change_request_id");
CREATE INDEX "flight_change_offers_request_timeline_idx" ON "flight_change_offers" ("change_request_id","created_at");
CREATE UNIQUE INDEX "flight_change_offers_duffel_offer_unique_idx" ON "flight_change_offers" ("duffel_order_change_offer_id");
CREATE UNIQUE INDEX "flight_order_changes_request_unique_idx" ON "flight_order_changes" ("change_request_id");
CREATE UNIQUE INDEX "flight_order_changes_duffel_change_unique_idx" ON "flight_order_changes" ("duffel_order_change_id");
CREATE INDEX "flight_change_events_request_timeline_idx" ON "flight_change_events" ("change_request_id","created_at");
CREATE INDEX "flight_change_events_type_idx" ON "flight_change_events" ("event_type","created_at");
