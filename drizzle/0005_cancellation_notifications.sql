ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'cancellation_request_received';--> statement-breakpoint
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'cancellation_manual_review';--> statement-breakpoint
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'cancellation_quote_ready';--> statement-breakpoint
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'cancellation_approved';--> statement-breakpoint
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'cancellation_rejected';--> statement-breakpoint
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'cancellation_completed';--> statement-breakpoint
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'cancellation_refund_completed';--> statement-breakpoint
ALTER TYPE "public"."notification_event_type" ADD VALUE IF NOT EXISTS 'cancellation_issue';
