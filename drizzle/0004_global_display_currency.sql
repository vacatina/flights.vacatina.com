CREATE TABLE IF NOT EXISTS "fx_rate_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"base_currency" text NOT NULL,
	"rates" jsonb NOT NULL,
	"provider_updated_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"fresh_until" timestamp with time zone NOT NULL,
	"stale_until" timestamp with time zone NOT NULL,
	"refresh_lease_until" timestamp with time zone,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fx_rate_snapshots_provider_base_unique_idx" ON "fx_rate_snapshots" USING btree ("provider","base_currency");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fx_rate_snapshots_freshness_idx" ON "fx_rate_snapshots" USING btree ("fresh_until","stale_until");
