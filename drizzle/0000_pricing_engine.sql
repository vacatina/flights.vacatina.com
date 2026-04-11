CREATE TYPE "pricing_adjustment_type" AS ENUM ('percent', 'fixed');
CREATE TYPE "pricing_journey_type" AS ENUM ('one_way', 'return');
CREATE TYPE "priced_quote_status" AS ENUM ('active', 'consumed', 'expired', 'cancelled');

CREATE TABLE "pricing_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "adjustment_type" "pricing_adjustment_type" NOT NULL,
  "adjustment_value" numeric(14, 4) NOT NULL,
  "active_from" timestamp with time zone,
  "active_to" timestamp with time zone,
  "journey_type" "pricing_journey_type",
  "origin_iata" text,
  "destination_iata" text,
  "airline_iata" text,
  "cabin_class" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "priced_quotes" (
  "id" text PRIMARY KEY NOT NULL,
  "partial_offer_request_id" text NOT NULL,
  "offer_id" text NOT NULL,
  "selected_partial_offers" jsonb NOT NULL,
  "currency" text NOT NULL,
  "net_amount" numeric(14, 4) NOT NULL,
  "sell_amount" numeric(14, 4) NOT NULL,
  "applied_rule_id" text,
  "status" "priced_quote_status" DEFAULT 'active' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "priced_quotes"
ADD CONSTRAINT "priced_quotes_applied_rule_id_pricing_rules_id_fk"
FOREIGN KEY ("applied_rule_id")
REFERENCES "public"."pricing_rules"("id")
ON DELETE set null
ON UPDATE no action;

CREATE INDEX "pricing_rules_active_lookup_idx"
ON "pricing_rules" ("enabled", "active_from", "active_to", "priority");

CREATE INDEX "pricing_rules_scope_lookup_idx"
ON "pricing_rules" (
  "journey_type",
  "origin_iata",
  "destination_iata",
  "airline_iata",
  "cabin_class"
);

CREATE INDEX "priced_quotes_validation_idx"
ON "priced_quotes" ("id", "status", "expires_at");

CREATE INDEX "priced_quotes_request_lookup_idx"
ON "priced_quotes" ("partial_offer_request_id", "offer_id", "created_at");
