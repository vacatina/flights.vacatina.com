CREATE TYPE "public"."notification_event_type" AS ENUM('booking_confirmed', 'hold_created', 'reconciliation_required');--> statement-breakpoint
CREATE TYPE "public"."notification_outbox_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
ALTER TABLE "flight_orders" ADD COLUMN "booking_reference" text;--> statement-breakpoint
ALTER TABLE "flight_orders" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "flight_orders" ADD COLUMN "contact_email_hash" text;--> statement-breakpoint
ALTER TABLE "flight_orders" ADD COLUMN "order_snapshot" jsonb;--> statement-breakpoint
UPDATE "flight_orders"
SET
  "booking_reference" = 'BK-' || upper(substring(replace("id", 'fod_', '') from 1 for 10)),
  "contact_email" = COALESCE("contact_email", 'unknown@example.com'),
  "contact_email_hash" = COALESCE("contact_email_hash", 'unknown'),
  "order_snapshot" = COALESCE("order_snapshot", '{}'::jsonb)
WHERE
  "booking_reference" IS NULL
  OR "contact_email" IS NULL
  OR "contact_email_hash" IS NULL
  OR "order_snapshot" IS NULL;--> statement-breakpoint
ALTER TABLE "flight_orders" ALTER COLUMN "booking_reference" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flight_orders" ALTER COLUMN "contact_email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flight_orders" ALTER COLUMN "contact_email_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flight_orders" ALTER COLUMN "order_snapshot" SET NOT NULL;--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"status" "notification_outbox_status" DEFAULT 'pending' NOT NULL,
	"flight_order_id" text,
	"checkout_session_id" text,
	"booking_reference" text,
	"recipient_email" text NOT NULL,
	"recipient_email_hash" text NOT NULL,
	"payload" jsonb,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_flight_order_id_flight_orders_id_fk" FOREIGN KEY ("flight_order_id") REFERENCES "public"."flight_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "flight_orders_booking_reference_unique_idx" ON "flight_orders" USING btree ("booking_reference");--> statement-breakpoint
CREATE INDEX "flight_orders_contact_email_hash_lookup_idx" ON "flight_orders" USING btree ("contact_email_hash");--> statement-breakpoint
CREATE INDEX "flight_orders_owner_lookup_idx" ON "flight_orders" USING btree ("owner_user_id","owner_guest_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_outbox_status_retry_idx" ON "notification_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "notification_outbox_recipient_lookup_idx" ON "notification_outbox" USING btree ("recipient_email_hash","created_at");--> statement-breakpoint
CREATE INDEX "notification_outbox_flight_order_lookup_idx" ON "notification_outbox" USING btree ("flight_order_id","created_at");--> statement-breakpoint
