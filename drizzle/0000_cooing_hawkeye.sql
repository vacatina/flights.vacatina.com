CREATE TYPE "public"."checkout_payment_mode" AS ENUM('pay_now', 'hold');--> statement-breakpoint
CREATE TYPE "public"."checkout_session_status" AS ENUM('processing', 'payment_authorized', 'completed', 'failed', 'reconciliation_required');--> statement-breakpoint
CREATE TYPE "public"."checkout_settlement_type" AS ENUM('balance');--> statement-breakpoint
CREATE TYPE "public"."guest_session_status" AS ENUM('active', 'linked', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."priced_quote_status" AS ENUM('active', 'consumed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pricing_adjustment_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."pricing_journey_type" AS ENUM('one_way', 'return');--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "clerk_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "guest_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"status" "guest_session_status" DEFAULT 'active' NOT NULL,
	"linked_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_user_links" (
	"id" text PRIMARY KEY NOT NULL,
	"guest_session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'org:member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priced_quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"partial_offer_request_id" text NOT NULL,
	"offer_id" text NOT NULL,
	"selected_partial_offers" jsonb NOT NULL,
	"currency" text NOT NULL,
	"net_amount" numeric(14, 4) NOT NULL,
	"sell_amount" numeric(14, 4) NOT NULL,
	"applied_rule_id" text,
	"owner_user_id" text,
	"owner_guest_id" text,
	"owner_org_id" text,
	"status" "priced_quote_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"primary_email" text,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_quote_id_priced_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."priced_quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_owner_guest_id_guest_sessions_id_fk" FOREIGN KEY ("owner_guest_id") REFERENCES "public"."guest_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_owner_org_id_organizations_id_fk" FOREIGN KEY ("owner_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flight_orders" ADD CONSTRAINT "flight_orders_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flight_orders" ADD CONSTRAINT "flight_orders_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flight_orders" ADD CONSTRAINT "flight_orders_owner_guest_id_guest_sessions_id_fk" FOREIGN KEY ("owner_guest_id") REFERENCES "public"."guest_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flight_orders" ADD CONSTRAINT "flight_orders_owner_org_id_organizations_id_fk" FOREIGN KEY ("owner_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_linked_user_id_users_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_user_links" ADD CONSTRAINT "guest_user_links_guest_session_id_guest_sessions_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_user_links" ADD CONSTRAINT "guest_user_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priced_quotes" ADD CONSTRAINT "priced_quotes_applied_rule_id_pricing_rules_id_fk" FOREIGN KEY ("applied_rule_id") REFERENCES "public"."pricing_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priced_quotes" ADD CONSTRAINT "priced_quotes_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priced_quotes" ADD CONSTRAINT "priced_quotes_owner_guest_id_guest_sessions_id_fk" FOREIGN KEY ("owner_guest_id") REFERENCES "public"."guest_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priced_quotes" ADD CONSTRAINT "priced_quotes_owner_org_id_organizations_id_fk" FOREIGN KEY ("owner_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_sessions_idempotency_key_unique_idx" ON "checkout_sessions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "checkout_sessions_lifecycle_idx" ON "checkout_sessions" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "checkout_sessions_request_lookup_idx" ON "checkout_sessions" USING btree ("partial_offer_request_id","offer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "flight_orders_checkout_session_unique_idx" ON "flight_orders" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "flight_orders_duffel_order_unique_idx" ON "flight_orders" USING btree ("duffel_order_id");--> statement-breakpoint
CREATE INDEX "flight_orders_request_lookup_idx" ON "flight_orders" USING btree ("partial_offer_request_id","offer_id","created_at");--> statement-breakpoint
CREATE INDEX "guest_sessions_lifecycle_idx" ON "guest_sessions" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "guest_user_links_guest_session_unique_idx" ON "guest_user_links" USING btree ("guest_session_id");--> statement-breakpoint
CREATE INDEX "guest_user_links_user_lookup_idx" ON "guest_user_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_org_user_unique_idx" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_members_org_lookup_idx" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_lookup_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "priced_quotes_validation_idx" ON "priced_quotes" USING btree ("id","status","expires_at");--> statement-breakpoint
CREATE INDEX "priced_quotes_request_lookup_idx" ON "priced_quotes" USING btree ("partial_offer_request_id","offer_id","created_at");--> statement-breakpoint
CREATE INDEX "priced_quotes_owner_lookup_idx" ON "priced_quotes" USING btree ("owner_user_id","owner_guest_id");--> statement-breakpoint
CREATE INDEX "pricing_rules_active_lookup_idx" ON "pricing_rules" USING btree ("enabled","active_from","active_to","priority");--> statement-breakpoint
CREATE INDEX "pricing_rules_scope_lookup_idx" ON "pricing_rules" USING btree ("journey_type","origin_iata","destination_iata","airline_iata","cabin_class");