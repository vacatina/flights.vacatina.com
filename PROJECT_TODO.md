# Vacatina Flights Todo

Based on the 15 July 2026 readiness audit. The project is a functional beta, but it is not ready for unrestricted real-money production traffic yet.

## P0 - Must Finish Before Real Payments

## Payment Module Refactor Progress

- [x] Add durable payment attempts, events, webhook inbox, and outbox repositories.
- [x] Store PayPal webhooks in an inbox before business processing.
- [x] Move completed PayPal capture fulfillment to a `fulfill_flight_order` outbox task.
- [x] Add payment job routes for webhook inbox processing, fulfillment outbox processing, exact-attempt fulfillment, and reconciliation.
- [x] Publish completed-capture fulfillment jobs to QStash while keeping Vercel Cron as the outbox fallback.
- [x] Stop active checkout webhook processing from writing the legacy processed-event repository.
- [ ] Add database-backed row claiming/leases for concurrent payment workers.
- [ ] Add PostgreSQL integration tests for simultaneous capture, webhook replay, and outbox worker races.
- [ ] Backfill or retire the legacy `payment_webhook_events` table after production data is understood.

- [ ] Require durable PostgreSQL in production.
  - [ ] Allow in-memory repositories only in explicit development/test mode.
  - [ ] Validate `DATABASE_URL` at production startup.
  - [ ] Make checkout, capture, webhook, and order operations fail closed if persistence is unavailable.
  - [ ] Add a production health check for database connectivity and required migrations.

- [ ] Fix PayPal webhook processing state.
  - [ ] Add webhook states: `received`, `processing`, `processed`, `failed`.
  - [ ] Store attempt count, next retry time, last error, and completion time.
  - [ ] Mark events `processed` only after the business transition succeeds.
  - [ ] Allow failed or abandoned events to be retried safely.
  - [ ] Add tests for failure before session resolution, amount validation, and Duffel finalization.

- [ ] Make payment capture and Duffel finalization concurrency-safe.
  - [ ] Add an atomic `payment_authorized -> finalizing` transition.
  - [ ] Use row locking, compare-and-swap, or a durable job claim.
  - [ ] Record a stable finalization/idempotency key before calling Duffel.
  - [ ] On retry, check local and provider state before creating another order.
  - [ ] Add simultaneous capture/webhook integration tests.

- [ ] Fix notification delivery semantics.
  - [ ] Fail closed when email is required but Resend is not configured.
  - [ ] Add a `configuration_error` or `skipped` state for deliberate no-email development mode.
  - [ ] Store provider message IDs for successful sends.
  - [ ] Treat missing provider confirmation as failure.

- [ ] Fix notification job authentication.
  - [ ] Exclude the notification job route from Clerk protection.
  - [ ] Require `NOTIFICATIONS_DISPATCH_SECRET` in production.
  - [ ] Return `401` for missing or invalid credentials.
  - [ ] Document scheduler URL, method, and required headers.

- [ ] Reconcile Drizzle migrations.
  - [ ] Synchronize TypeScript schema, SQL migrations, journal, and snapshots.
  - [ ] Test migration from an empty database.
  - [ ] Test upgrade from a database containing only migration `0000`.
  - [ ] Add migration drift verification to CI.

- [ ] Make production builds reproducible.
  - [ ] Replace `next/font/google` with local font files, or verify dependable build-time font access.
  - [ ] Run production build from a clean dependency cache.
  - [ ] Ensure a network-restricted build completes successfully.

- [ ] Add CI quality gates.
  - [ ] Install dependencies.
  - [ ] Run lint.
  - [ ] Run TypeScript typecheck.
  - [ ] Run test suite.
  - [ ] Run production build.
  - [ ] Run migration drift check.
  - [ ] Run secret scanning.

## P1 - Needed For Controlled Production Beta

- [ ] Finish PayPal v6 guest card implementation.
  - [ ] Commit the current card implementation and tests.
  - [ ] Verify eligibility by country, currency, and browser.
  - [ ] Test validation errors, 3-D Secure flows, cancellation, recoverable errors, and hard failures.
  - [ ] Cover wallet-only, card-only, both-eligible, and neither-eligible UI states.
  - [ ] Add browser E2E tests using PayPal sandbox cards.

- [ ] Add PayPal sandbox E2E coverage.
  - [ ] Create order.
  - [ ] Approval.
  - [ ] Capture.
  - [ ] Cancellation.
  - [ ] Denial.
  - [ ] Refund.
  - [ ] Duplicate webhook.
  - [ ] Delayed webhook.
  - [ ] Amount mismatch.

- [ ] Add Duffel sandbox E2E coverage.
  - [ ] One-way booking.
  - [ ] Return booking.
  - [ ] Multi-city booking.
  - [ ] Hold booking.
  - [ ] Seat selection.
  - [ ] Bag selection.
  - [ ] Supplier timeout and expiry cases.

- [ ] Add browser E2E coverage for search and results.
  - [ ] One-way search.
  - [ ] Return search.
  - [ ] Multi-city 2-leg, 3-leg, and 6-leg scenarios.
  - [ ] Filters and sorting.
  - [ ] Pagination without duplicate or missing offers.
  - [ ] Navigation from results to review and back.
  - [ ] Timezone-sensitive departure dates near midnight.

- [ ] Harden pricing and quote consumption.
  - [ ] Add PostgreSQL integration tests for rules, quotes, expiry, and consumption.
  - [ ] Make quote consumption atomic with checkout finalization.
  - [ ] Add pricing-rule audit history.
  - [ ] Verify currency rounding for every supported charge currency.
  - [ ] Define behavior when no pricing rule matches.

- [ ] Complete seats and bags verification.
  - [ ] Server-recalculate ancillary prices.
  - [ ] Test expired, unavailable, or changed-price services.
  - [ ] Persist selected services in booking snapshots.
  - [ ] Display selected services correctly on booking detail.
  - [ ] Add fallback behavior when seat maps cannot load.

- [ ] Complete held-order payment loop.
  - [ ] Show payment deadline and price-guarantee deadline.
  - [ ] Add `Complete payment` action for eligible held orders.
  - [ ] Re-fetch live Duffel order before payment.
  - [ ] Handle expired holds, changed prices, and cancelled provider orders.
  - [ ] Send scheduled payment reminders before expiry.
  - [ ] Decide whether held orders can add ancillaries before payment.

- [ ] Improve booking detail live synchronization.
  - [ ] Map fetched Duffel order into the booking-detail model.
  - [ ] Persist refreshed provider snapshot and normalized status fields.
  - [ ] Show refresh time, provider status, payment deadline, services, and important status changes.
  - [ ] Handle provider order-not-found and terminal cancellation states.
  - [ ] Add tests proving the visible view changes after refresh.

- [ ] Replace guest lookup in-memory rate limiting.
  - [ ] Use Redis, database-backed rate limiting, or infrastructure rate limiting.
  - [ ] Normalize trusted proxy/IP handling.
  - [ ] Limit by IP, booking reference, and normalized email hash.
  - [ ] Add security event metrics without logging raw email addresses.
  - [ ] Test multiple app instances and process restarts.

- [ ] Make email notification dispatch production-safe.
  - [ ] Add row claiming or leases so multiple dispatchers cannot send the same record.
  - [ ] Add attempt history and dead-letter handling.
  - [ ] Add tests for retries, permanent failures, duplicate dispatch, and provider timeout.
  - [ ] Add scheduled dispatch instead of relying mainly on request-path sending.
  - [ ] Add email previews and template tests.

- [ ] Add operations, telemetry, and alerts.
  - [ ] Track search, quote, checkout, capture, finalization, webhook, notification, and reconciliation outcomes.
  - [ ] Alert on captured-but-unbooked payments.
  - [ ] Alert on failed webhooks.
  - [ ] Alert on notification backlog.
  - [ ] Alert on database errors.
  - [ ] Build a restricted reconciliation/support console.
  - [ ] Document backup, restore, retention, and incident response.

- [ ] Add authentication and booking access tests.
  - [ ] Sign-up.
  - [ ] Sign-in.
  - [ ] Sign-out.
  - [ ] Redirect-back behavior.
  - [ ] Protected booking access.
  - [ ] Public webhook route behavior.
  - [ ] Clerk user webhook duplicates, out-of-order updates, and deletion.

## P2 - Complete Booking Lifecycle And Growth Work

- [ ] Add cancellation, change, and refund workflows.
  - [ ] Define self-service vs support-assisted actions.
  - [ ] Model request state transitions.
  - [ ] Re-fetch live provider conditions before eligibility or price display.
  - [ ] Require confirmation of penalties, residual value, and refund timing.
  - [ ] Add staff approval/reconciliation tools.
  - [ ] Add signed audit events and customer notifications.

- [ ] Suggested delivery order for post-booking workflows.
  - [ ] Cancellation request with support review.
  - [ ] Refund-status tracking.
  - [ ] Automated cancellation for clearly eligible sandbox cases.
  - [ ] Flight-change quote and customer acceptance.
  - [ ] Fully automated change processing after provider behavior is proven.

- [ ] Add post-booking extras.
  - [ ] Post-booking bag purchase.
  - [ ] Post-booking seat changes where supported.
  - [ ] Better seat-map accessibility and mobile presentation.

- [ ] Add customer account improvements.
  - [ ] Account profile management.
  - [ ] Traveler profile management.
  - [ ] Saved travelers.
  - [ ] Repeat-booking shortcuts.
  - [ ] Account deletion and data-retention workflows.

- [ ] Add booking document features.
  - [ ] Downloadable receipts.
  - [ ] Downloadable itineraries.
  - [ ] Printable pre-booking itinerary summary.

- [ ] Add pricing administration.
  - [ ] Pricing-rule management UI.
  - [ ] Rule preview/simulation before activation.
  - [ ] Versioned rule deployment.
  - [ ] Approval, rollback, and reporting.

- [ ] Add product and scale improvements.
  - [ ] Load testing.
  - [ ] Capacity planning.
  - [ ] Funnel analytics.
  - [ ] Service-level objectives.
  - [ ] Organization/team booking views only if B2B is confirmed.

## Recommended Milestones

### Milestone 0 - Payment-Safe Foundation

- [ ] Durable database required in production.
- [ ] Retry-safe PayPal webhook state model.
- [ ] Concurrency-safe checkout finalization.
- [ ] Correct notification delivery and scheduler authentication.
- [ ] Reconciled Drizzle migrations.
- [ ] Reproducible production build.
- [ ] CI quality gates.

### Milestone 1 - Controlled Production Beta

- [ ] PayPal wallet and guest-card sandbox E2E coverage.
- [ ] Duffel E2E coverage for one-way, return, multi-city, hold, seats, and bags.
- [ ] Distributed guest-lookup rate limiting.
- [ ] Durable telemetry and alerts.
- [ ] Reconciliation/support console.
- [ ] Reliable scheduled notification dispatch.
- [ ] Live booking synchronization.

### Milestone 2 - Complete Booking Lifecycle

- [ ] Pay held bookings.
- [ ] Hold expiry reminders and handling.
- [ ] Cancellation request and refund tracking.
- [ ] Flight-change workflow.
- [ ] Post-booking seats and bags where supported.
- [ ] Receipts and downloadable itineraries.

### Milestone 3 - Scale And Optimization

- [ ] Performance and load testing.
- [ ] Pricing administration and audit tools.
- [ ] Customer profiles and saved travelers.
- [ ] Organization features if B2B is confirmed.
- [ ] Product funnel analytics and service-level objectives.

## Production Readiness Exit Criteria

- [ ] All P0 work is complete.
- [ ] Clean CI passes from a fresh environment.
- [ ] Fresh and upgrade database migrations pass.
- [ ] PayPal and Duffel sandbox E2E suites pass reliably.
- [ ] Concurrent and duplicate payment callbacks are proven safe.
- [ ] Captured-but-unbooked payments generate immediate alerts and appear in a reconciliation console.
- [ ] Notification delivery and retry behavior are observable and tested.
- [ ] Backup restoration and incident-response procedures have been exercised.
- [ ] A controlled beta has completed without unresolved payment or order consistency issues.
