ALTER TABLE "checkout_sessions"
ADD COLUMN "payment_provider" text;

ALTER TABLE "checkout_sessions"
ADD COLUMN "provider_order_id" text;

ALTER TABLE "checkout_sessions"
ADD COLUMN "provider_payment_id" text;

ALTER TABLE "checkout_sessions"
ADD COLUMN "provider_status_code" text;

ALTER TABLE "checkout_sessions"
ADD COLUMN "provider_status_message" text;

ALTER TABLE "checkout_sessions"
ADD COLUMN "payment_currency" text;

ALTER TABLE "checkout_sessions"
ADD COLUMN "payment_amount" numeric(14, 4);

ALTER TABLE "checkout_sessions"
ADD COLUMN "fx_source_currency" text;

ALTER TABLE "checkout_sessions"
ADD COLUMN "fx_target_currency" text;

ALTER TABLE "checkout_sessions"
ADD COLUMN "fx_base_rate" numeric(18, 8);

ALTER TABLE "checkout_sessions"
ADD COLUMN "fx_buffer_percent" numeric(8, 4);

ALTER TABLE "checkout_sessions"
ADD COLUMN "fx_effective_rate" numeric(18, 8);

ALTER TABLE "checkout_sessions"
ADD COLUMN "checkout_payload_snapshot" jsonb;

ALTER TABLE "checkout_sessions"
ADD COLUMN "payment_initiated_at" timestamp with time zone;

ALTER TABLE "checkout_sessions"
ADD COLUMN "payment_confirmed_at" timestamp with time zone;

ALTER TABLE "checkout_sessions"
ADD COLUMN "finalized_at" timestamp with time zone;

CREATE UNIQUE INDEX "checkout_sessions_provider_order_id_unique_idx"
ON "checkout_sessions" ("provider_order_id");

CREATE TABLE "payment_webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "event_key" text NOT NULL,
  "provider_order_id" text NOT NULL,
  "provider_payment_id" text,
  "payload" jsonb,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "payment_webhook_events_provider_event_unique_idx"
ON "payment_webhook_events" ("provider", "event_key");

CREATE INDEX "payment_webhook_events_provider_order_lookup_idx"
ON "payment_webhook_events" ("provider", "provider_order_id", "created_at");

