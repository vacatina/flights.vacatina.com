CREATE TYPE "checkout_session_status" AS ENUM (
  'processing',
  'payment_authorized',
  'completed',
  'failed',
  'reconciliation_required'
);

CREATE TYPE "checkout_payment_mode" AS ENUM ('pay_now', 'hold');

CREATE TYPE "checkout_settlement_type" AS ENUM ('balance');

CREATE TABLE "checkout_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "idempotency_key" text NOT NULL,
  "partial_offer_request_id" text NOT NULL,
  "quote_id" text NOT NULL,
  "offer_id" text NOT NULL,
  "selected_partial_offers" jsonb NOT NULL,
  "owner_user_id" text,
  "owner_guest_id" text,
  "owner_org_id" text,
  "payment_mode" "checkout_payment_mode" NOT NULL,
  "currency" text NOT NULL,
  "net_amount" numeric(14, 4) NOT NULL,
  "sell_amount" numeric(14, 4) NOT NULL,
  "external_payment_authorization_id" text,
  "external_payment_capture_id" text,
  "duffel_order_id" text,
  "status" "checkout_session_status" DEFAULT 'processing' NOT NULL,
  "error_code" text,
  "error_message" text,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "checkout_sessions"
ADD CONSTRAINT "checkout_sessions_quote_id_priced_quotes_id_fk"
FOREIGN KEY ("quote_id")
REFERENCES "public"."priced_quotes"("id")
ON DELETE cascade
ON UPDATE no action;

ALTER TABLE "checkout_sessions"
ADD CONSTRAINT "checkout_sessions_owner_user_id_users_id_fk"
FOREIGN KEY ("owner_user_id")
REFERENCES "public"."users"("id")
ON DELETE set null
ON UPDATE no action;

ALTER TABLE "checkout_sessions"
ADD CONSTRAINT "checkout_sessions_owner_guest_id_guest_sessions_id_fk"
FOREIGN KEY ("owner_guest_id")
REFERENCES "public"."guest_sessions"("id")
ON DELETE set null
ON UPDATE no action;

ALTER TABLE "checkout_sessions"
ADD CONSTRAINT "checkout_sessions_owner_org_id_organizations_id_fk"
FOREIGN KEY ("owner_org_id")
REFERENCES "public"."organizations"("id")
ON DELETE set null
ON UPDATE no action;

CREATE UNIQUE INDEX "checkout_sessions_idempotency_key_unique_idx"
ON "checkout_sessions" ("idempotency_key");

CREATE INDEX "checkout_sessions_lifecycle_idx"
ON "checkout_sessions" ("status", "expires_at");

CREATE INDEX "checkout_sessions_request_lookup_idx"
ON "checkout_sessions" ("partial_offer_request_id", "offer_id", "created_at");

CREATE TABLE "flight_orders" (
  "id" text PRIMARY KEY NOT NULL,
  "checkout_session_id" text NOT NULL,
  "duffel_order_id" text NOT NULL,
  "partial_offer_request_id" text NOT NULL,
  "offer_id" text NOT NULL,
  "selected_partial_offers" jsonb NOT NULL,
  "owner_user_id" text,
  "owner_guest_id" text,
  "owner_org_id" text,
  "payment_mode" "checkout_payment_mode" NOT NULL,
  "settlement_type" "checkout_settlement_type" DEFAULT 'balance' NOT NULL,
  "currency" text NOT NULL,
  "net_amount" numeric(14, 4) NOT NULL,
  "sell_amount" numeric(14, 4) NOT NULL,
  "duffel_total_amount" numeric(14, 4) NOT NULL,
  "duffel_total_currency" text NOT NULL,
  "payment_awaiting" boolean DEFAULT false NOT NULL,
  "payment_required_by" timestamp with time zone,
  "price_guarantee_expires_at" timestamp with time zone,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "flight_orders"
ADD CONSTRAINT "flight_orders_checkout_session_id_checkout_sessions_id_fk"
FOREIGN KEY ("checkout_session_id")
REFERENCES "public"."checkout_sessions"("id")
ON DELETE cascade
ON UPDATE no action;

ALTER TABLE "flight_orders"
ADD CONSTRAINT "flight_orders_owner_user_id_users_id_fk"
FOREIGN KEY ("owner_user_id")
REFERENCES "public"."users"("id")
ON DELETE set null
ON UPDATE no action;

ALTER TABLE "flight_orders"
ADD CONSTRAINT "flight_orders_owner_guest_id_guest_sessions_id_fk"
FOREIGN KEY ("owner_guest_id")
REFERENCES "public"."guest_sessions"("id")
ON DELETE set null
ON UPDATE no action;

ALTER TABLE "flight_orders"
ADD CONSTRAINT "flight_orders_owner_org_id_organizations_id_fk"
FOREIGN KEY ("owner_org_id")
REFERENCES "public"."organizations"("id")
ON DELETE set null
ON UPDATE no action;

CREATE UNIQUE INDEX "flight_orders_checkout_session_unique_idx"
ON "flight_orders" ("checkout_session_id");

CREATE UNIQUE INDEX "flight_orders_duffel_order_unique_idx"
ON "flight_orders" ("duffel_order_id");

CREATE INDEX "flight_orders_request_lookup_idx"
ON "flight_orders" ("partial_offer_request_id", "offer_id", "created_at");
