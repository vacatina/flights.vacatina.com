SET lock_timeout = '10s';--> statement-breakpoint
SET statement_timeout = '60s';--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."payment_provider" AS ENUM('paypal');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."payment_attempt_status" AS ENUM('created', 'provider_order_created', 'buyer_approved', 'capture_pending', 'capture_completed', 'capture_denied', 'capture_failed', 'refunded', 'reversed', 'disputed', 'fulfillment_pending', 'fulfilled', 'reconciliation_required', 'cancelled');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."payment_event_type" AS ENUM('PAYMENT_INITIATED', 'PROVIDER_ORDER_CREATED', 'BUYER_APPROVED', 'CAPTURE_REQUESTED', 'CAPTURE_COMPLETED', 'CAPTURE_PENDING', 'CAPTURE_DENIED', 'WEBHOOK_RECEIVED', 'WEBHOOK_PROCESSED', 'FULFILLMENT_REQUESTED', 'FULFILLMENT_COMPLETED', 'FULFILLMENT_FAILED', 'REFUND_DETECTED', 'REVERSAL_DETECTED', 'DISPUTE_DETECTED', 'RECONCILIATION_CHECKED', 'RECONCILIATION_REPAIRED', 'RECONCILIATION_REQUIRED');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."payment_webhook_inbox_status" AS ENUM('received', 'processing', 'processed', 'failed', 'ignored');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."payment_outbox_status" AS ENUM('pending', 'processing', 'completed', 'failed');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."payment_outbox_task_type" AS ENUM('fulfill_flight_order', 'send_receipt', 'notify_admin', 'sync_payment_state');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"internal_order_type" text NOT NULL,
	"internal_order_id" text NOT NULL,
	"owner_user_id" text,
	"owner_guest_id" text,
	"owner_org_id" text,
	"provider" "payment_provider" NOT NULL,
	"status" "payment_attempt_status" DEFAULT 'created' NOT NULL,
	"currency" text NOT NULL,
	"amount" numeric(14, 4) NOT NULL,
	"provider_order_id" text,
	"provider_capture_id" text,
	"provider_status" text,
	"create_idempotency_key" text NOT NULL,
	"capture_idempotency_key" text NOT NULL,
	"client_idempotency_key" text NOT NULL,
	"checkout_payload_snapshot" jsonb,
	"last_provider_payload" jsonb,
	"failure_code" text,
	"failure_message" text,
	"reconciliation_required_at" timestamp with time zone,
	"next_reconciliation_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_attempt_id" text NOT NULL,
	"event_type" "payment_event_type" NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_event_id" text,
	"provider_order_id" text,
	"provider_capture_id" text,
	"amount" numeric(14, 4),
	"currency" text,
	"payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_webhook_inbox" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"provider_order_id" text,
	"provider_capture_id" text,
	"status" "payment_webhook_inbox_status" DEFAULT 'received' NOT NULL,
	"payload" jsonb,
	"headers" jsonb,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"task_type" "payment_outbox_task_type" NOT NULL,
	"status" "payment_outbox_status" DEFAULT 'pending' NOT NULL,
	"unique_key" text NOT NULL,
	"payment_attempt_id" text NOT NULL,
	"internal_order_type" text NOT NULL,
	"internal_order_id" text NOT NULL,
	"payload" jsonb,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN IF NOT EXISTS "payment_attempt_id" text;--> statement-breakpoint
ALTER TABLE "flight_orders" ADD COLUMN IF NOT EXISTS "payment_attempt_id" text;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_owner_guest_id_guest_sessions_id_fk" FOREIGN KEY ("owner_guest_id") REFERENCES "public"."guest_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_owner_org_id_organizations_id_fk" FOREIGN KEY ("owner_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "payment_outbox" ADD CONSTRAINT "payment_outbox_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "flight_orders" ADD CONSTRAINT "flight_orders_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempts_provider_order_unique_idx" ON "payment_attempts" USING btree ("provider","provider_order_id") WHERE "provider_order_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempts_internal_idempotency_unique_idx" ON "payment_attempts" USING btree ("internal_order_type","internal_order_id","client_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempts_create_idempotency_unique_idx" ON "payment_attempts" USING btree ("create_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempts_capture_idempotency_unique_idx" ON "payment_attempts" USING btree ("capture_idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_attempts_reconciliation_idx" ON "payment_attempts" USING btree ("status","next_reconciliation_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_attempts_owner_lookup_idx" ON "payment_attempts" USING btree ("owner_user_id","owner_guest_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_events_attempt_timeline_idx" ON "payment_events" USING btree ("payment_attempt_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_events_provider_event_unique_idx" ON "payment_events" USING btree ("provider","provider_event_id","event_type") WHERE "provider_event_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_inbox_provider_event_unique_idx" ON "payment_webhook_inbox" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_webhook_inbox_status_retry_idx" ON "payment_webhook_inbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_webhook_inbox_provider_order_lookup_idx" ON "payment_webhook_inbox" USING btree ("provider","provider_order_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_outbox_unique_key_idx" ON "payment_outbox" USING btree ("unique_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_outbox_status_retry_idx" ON "payment_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_outbox_attempt_timeline_idx" ON "payment_outbox" USING btree ("payment_attempt_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "flight_orders_payment_attempt_unique_idx" ON "flight_orders" USING btree ("payment_attempt_id") WHERE "payment_attempt_id" IS NOT NULL;--> statement-breakpoint
RESET statement_timeout;--> statement-breakpoint
RESET lock_timeout;
