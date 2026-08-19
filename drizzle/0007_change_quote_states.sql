ALTER TYPE "public"."flight_change_status" ADD VALUE IF NOT EXISTS 'quote_ready';
ALTER TYPE "public"."flight_change_status" ADD VALUE IF NOT EXISTS 'quote_unavailable';
