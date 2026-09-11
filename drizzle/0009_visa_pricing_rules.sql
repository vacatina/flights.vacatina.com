CREATE TYPE "public"."visa_pricing_fee_component" AS ENUM ('processing_fee', 'government_fee');
CREATE TYPE "public"."visa_pricing_rule_event_type" AS ENUM ('created', 'updated', 'enabled', 'disabled');

CREATE TABLE "visa_pricing_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "fee_component" "visa_pricing_fee_component" NOT NULL,
  "adjustment_type" "pricing_adjustment_type" NOT NULL,
  "adjustment_amount" numeric(30, 0) NOT NULL,
  "adjustment_scale" integer NOT NULL,
  "adjustment_currency" text,
  "nationality_code" text,
  "destination_code" text,
  "visa_type_id" text,
  "provider_product_id" text,
  "active_from" timestamp with time zone,
  "active_to" timestamp with time zone,
  "created_by" text,
  "updated_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "visa_pricing_rules_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null,
  CONSTRAINT "visa_pricing_rules_updated_by_users_id_fk"
    FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null,
  CONSTRAINT "visa_pricing_rules_priority_check"
    CHECK ("priority" BETWEEN 0 AND 1000),
  CONSTRAINT "visa_pricing_rules_adjustment_scale_check"
    CHECK ("adjustment_scale" BETWEEN 0 AND 12),
  CONSTRAINT "visa_pricing_rules_adjustment_amount_check"
    CHECK ("adjustment_amount" >= 0),
  CONSTRAINT "visa_pricing_rules_fixed_currency_check"
    CHECK (
      ("adjustment_type" = 'percent' AND "adjustment_currency" IS NULL)
      OR
      ("adjustment_type" = 'fixed' AND "adjustment_currency" ~ '^[A-Z]{3}$')
    ),
  CONSTRAINT "visa_pricing_rules_active_window_check"
    CHECK ("active_from" IS NULL OR "active_to" IS NULL OR "active_from" < "active_to")
);

CREATE TABLE "visa_pricing_rule_events" (
  "id" text PRIMARY KEY NOT NULL,
  "rule_id" text NOT NULL,
  "actor_user_id" text,
  "event_type" "visa_pricing_rule_event_type" NOT NULL,
  "reason" text,
  "before_snapshot" jsonb,
  "after_snapshot" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "visa_pricing_rule_events_rule_id_visa_pricing_rules_id_fk"
    FOREIGN KEY ("rule_id") REFERENCES "public"."visa_pricing_rules"("id") ON DELETE cascade,
  CONSTRAINT "visa_pricing_rule_events_actor_user_id_users_id_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null
);

CREATE INDEX "visa_pricing_rules_active_lookup_idx"
  ON "visa_pricing_rules" USING btree ("enabled", "active_from", "active_to", "priority");
CREATE INDEX "visa_pricing_rules_scope_lookup_idx"
  ON "visa_pricing_rules" USING btree (
    "fee_component",
    "nationality_code",
    "destination_code",
    "visa_type_id",
    "provider_product_id"
  );
CREATE INDEX "visa_pricing_rule_events_timeline_idx"
  ON "visa_pricing_rule_events" USING btree ("rule_id", "created_at");
