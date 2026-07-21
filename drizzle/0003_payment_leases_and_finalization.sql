ALTER TYPE "public"."checkout_session_status" ADD VALUE IF NOT EXISTS 'finalizing' AFTER 'payment_authorized';--> statement-breakpoint
ALTER TYPE "public"."payment_outbox_task_type" ADD VALUE IF NOT EXISTS 'fulfill_paid_resource' AFTER 'fulfill_flight_order';--> statement-breakpoint

ALTER TABLE "payment_outbox" ADD COLUMN IF NOT EXISTS "claimed_by" text;--> statement-breakpoint
ALTER TABLE "payment_outbox" ADD COLUMN IF NOT EXISTS "claim_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_outbox" ADD COLUMN IF NOT EXISTS "processing_started_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_outbox_claimable_idx" ON "payment_outbox" USING btree ("status","next_attempt_at","claim_expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_outbox_claimed_idx" ON "payment_outbox" USING btree ("claimed_by","claim_expires_at");--> statement-breakpoint

ALTER TABLE "payment_webhook_inbox" ADD COLUMN IF NOT EXISTS "claimed_by" text;--> statement-breakpoint
ALTER TABLE "payment_webhook_inbox" ADD COLUMN IF NOT EXISTS "claim_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_webhook_inbox_claimable_idx" ON "payment_webhook_inbox" USING btree ("status","next_attempt_at","claim_expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_webhook_inbox_claimed_idx" ON "payment_webhook_inbox" USING btree ("claimed_by","claim_expires_at");--> statement-breakpoint
