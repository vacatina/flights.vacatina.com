-- Collapse manual catalog fees into one exact per-traveler price.
-- No reset, provider/markup changes, or unrelated table changes.
ALTER TABLE visa_listings ADD COLUMN price_minor numeric(30, 0);
UPDATE visa_listings
SET price_minor = government_fee_minor + processing_fee_minor
WHERE government_fee_minor IS NOT NULL AND processing_fee_minor IS NOT NULL;
ALTER TABLE visa_listings DROP CONSTRAINT visa_listings_fees_check;
ALTER TABLE visa_listings DROP COLUMN government_fee_minor;
ALTER TABLE visa_listings DROP COLUMN processing_fee_minor;
ALTER TABLE visa_listings ADD CONSTRAINT visa_listings_price_check
  CHECK (price_minor IS NULL OR price_minor >= 0);
--> statement-breakpoint
-- One-time conversion of any existing frozen requests; preserve their totals.
UPDATE visa_applications
SET listing_snapshot =
      (listing_snapshot - 'governmentFeeMinor' - 'processingFeeMinor') ||
      jsonb_build_object(
        'priceMinor',
        ((listing_snapshot->>'governmentFeeMinor')::numeric +
         (listing_snapshot->>'processingFeeMinor')::numeric)::text
      ),
    pricing_snapshot = pricing_snapshot - 'governmentFee' - 'processingFee'
WHERE listing_snapshot ? 'governmentFeeMinor'
  AND listing_snapshot ? 'processingFeeMinor';
