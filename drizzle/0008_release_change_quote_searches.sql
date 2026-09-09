-- Kept separate from the enum migration because PostgreSQL only allows using a
-- newly added enum value after the transaction that added it has committed.
UPDATE "flight_change_requests"
SET "status" = 'quote_ready',
    "customer_message" = 'Choose a flight to create a final airline quote. Your booking remains unchanged until you confirm it.'
WHERE "status" = 'offers_ready';

-- A prior version saved offers before it changed the request status. If that
-- status write failed, the customer was left on a Searching screen despite
-- having offers. Recover only those records that demonstrably have offers.
UPDATE "flight_change_requests" AS request
SET "status" = 'quote_ready',
    "customer_message" = 'Your replacement flight quotes are ready. Your booking remains unchanged until you confirm a final quote.'
WHERE request."status" = 'searching'
  AND EXISTS (
    SELECT 1 FROM "flight_change_offers" AS offer
    WHERE offer."change_request_id" = request."id"
  );

DROP INDEX IF EXISTS "flight_change_requests_one_active_order_idx";
CREATE UNIQUE INDEX "flight_change_requests_one_active_order_idx"
  ON "flight_change_requests" ("flight_order_id")
  WHERE "status" NOT IN ('quote_ready', 'quote_unavailable', 'completed', 'rejected', 'expired');
