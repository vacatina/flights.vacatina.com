DO $$ BEGIN
 CREATE TYPE "public"."flight_cancellation_status" AS ENUM('requested', 'quote_pending', 'quote_ready', 'admin_review_required', 'duffel_confirming', 'duffel_cancelled', 'manual_processing', 'refund_pending', 'refund_completed', 'completed', 'rejected', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."flight_cancellation_fee_type" AS ENUM('none', 'fixed', 'percent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."flight_refund_status" AS ENUM('pending', 'approved', 'processing', 'completed', 'failed', 'manual_completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."flight_cancellation_event_actor_type" AS ENUM('customer', 'guest', 'admin', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "flight_cancellation_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "flight_order_id" text NOT NULL,
  "booking_reference" text NOT NULL,
  "duffel_order_id" text NOT NULL,
  "requested_by_user_id" text,
  "requested_by_guest_id" text,
  "customer_reason" text NOT NULL,
  "status" "flight_cancellation_status" DEFAULT 'requested' NOT NULL,
  "duffel_api_available" boolean,
  "admin_fee_type" "flight_cancellation_fee_type" DEFAULT 'none' NOT NULL,
  "admin_fee_value" numeric(14, 4) DEFAULT '0' NOT NULL,
  "admin_fee_amount" numeric(14, 4) DEFAULT '0' NOT NULL,
  "customer_refund_amount" numeric(14, 4),
  "customer_refund_currency" text,
  "customer_message" text,
  "customer_message_updated_by" text,
  "customer_message_updated_at" timestamp with time zone,
  "cutoff_override_by" text,
  "cutoff_override_at" timestamp with time zone,
  "cutoff_override_reason" text,
  "cancellation_approved_by" text,
  "cancellation_approved_at" timestamp with time zone,
  "refund_approved_by" text,
  "refund_approved_at" timestamp with time zone,
  "admin_rejection_reason" text,
  "rejected_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "flight_cancellation_quotes" (
  "id" text PRIMARY KEY NOT NULL,
  "cancellation_request_id" text NOT NULL,
  "duffel_order_cancellation_id" text NOT NULL,
  "refund_amount" numeric(14, 4),
  "refund_currency" text,
  "refund_to" text,
  "expires_at" timestamp with time zone,
  "confirmed_at" timestamp with time zone,
  "raw_payload" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "flight_refund_attempts" (
  "id" text PRIMARY KEY NOT NULL,
  "cancellation_request_id" text NOT NULL,
  "payment_attempt_id" text,
  "provider" "payment_provider" NOT NULL,
  "provider_capture_id" text,
  "provider_refund_id" text,
  "amount" numeric(14, 4) NOT NULL,
  "currency" text NOT NULL,
  "status" "flight_refund_status" DEFAULT 'pending' NOT NULL,
  "raw_payload" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "flight_cancellation_events" (
  "id" text PRIMARY KEY NOT NULL,
  "cancellation_request_id" text NOT NULL,
  "actor_type" "flight_cancellation_event_actor_type" NOT NULL,
  "actor_id" text,
  "event_type" text NOT NULL,
  "message" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "business_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "business_name" text NOT NULL,
  "support_email" text NOT NULL,
  "support_phone" text NOT NULL,
  "support_whatsapp" text NOT NULL,
  "address" text NOT NULL,
  "timezone" text NOT NULL,
  "updated_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "flight_cancellation_requests" ADD CONSTRAINT "flight_cancellation_requests_flight_order_id_flight_orders_id_fk" FOREIGN KEY ("flight_order_id") REFERENCES "public"."flight_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flight_cancellation_requests" ADD CONSTRAINT "flight_cancellation_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flight_cancellation_requests" ADD CONSTRAINT "flight_cancellation_requests_requested_by_guest_id_guest_sessions_id_fk" FOREIGN KEY ("requested_by_guest_id") REFERENCES "public"."guest_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flight_cancellation_requests" ADD CONSTRAINT "flight_cancellation_requests_customer_message_updated_by_users_id_fk" FOREIGN KEY ("customer_message_updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flight_cancellation_requests" ADD CONSTRAINT "flight_cancellation_requests_cutoff_override_by_users_id_fk" FOREIGN KEY ("cutoff_override_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flight_cancellation_requests" ADD CONSTRAINT "flight_cancellation_requests_cancellation_approved_by_users_id_fk" FOREIGN KEY ("cancellation_approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flight_cancellation_requests" ADD CONSTRAINT "flight_cancellation_requests_refund_approved_by_users_id_fk" FOREIGN KEY ("refund_approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flight_cancellation_quotes" ADD CONSTRAINT "flight_cancellation_quotes_cancellation_request_id_flight_cancellation_requests_id_fk" FOREIGN KEY ("cancellation_request_id") REFERENCES "public"."flight_cancellation_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flight_refund_attempts" ADD CONSTRAINT "flight_refund_attempts_cancellation_request_id_flight_cancellation_requests_id_fk" FOREIGN KEY ("cancellation_request_id") REFERENCES "public"."flight_cancellation_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flight_refund_attempts" ADD CONSTRAINT "flight_refund_attempts_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flight_cancellation_events" ADD CONSTRAINT "flight_cancellation_events_cancellation_request_id_flight_cancellation_requests_id_fk" FOREIGN KEY ("cancellation_request_id") REFERENCES "public"."flight_cancellation_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "flight_cancellation_requests_order_lookup_idx" ON "flight_cancellation_requests" USING btree ("flight_order_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flight_cancellation_requests_booking_reference_lookup_idx" ON "flight_cancellation_requests" USING btree ("booking_reference","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flight_cancellation_requests_status_queue_idx" ON "flight_cancellation_requests" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flight_cancellation_requests_requester_lookup_idx" ON "flight_cancellation_requests" USING btree ("requested_by_user_id","requested_by_guest_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flight_cancellation_quotes_request_timeline_idx" ON "flight_cancellation_quotes" USING btree ("cancellation_request_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "flight_cancellation_quotes_duffel_cancellation_unique_idx" ON "flight_cancellation_quotes" USING btree ("duffel_order_cancellation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flight_refund_attempts_request_timeline_idx" ON "flight_refund_attempts" USING btree ("cancellation_request_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "flight_refund_attempts_provider_refund_unique_idx" ON "flight_refund_attempts" USING btree ("provider","provider_refund_id") WHERE "provider_refund_id" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flight_cancellation_events_request_timeline_idx" ON "flight_cancellation_events" USING btree ("cancellation_request_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flight_cancellation_events_type_idx" ON "flight_cancellation_events" USING btree ("event_type","created_at");
