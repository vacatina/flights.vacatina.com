# Vacatina Flights — Project Readiness Report and Roadmap

**Audit date:** 15 July 2026  
**Audited branch:** `paypal-migration`  
**Current maturity:** Functional beta; not yet ready for unrestricted real-money production traffic

## Executive summary

Vacatina Flights has a strong functional foundation. The complete customer journey—from flight search through fare selection, checkout, payment, and booking lookup—is represented in the codebase. Search, results, fare review, pricing, validation, and most domain logic are well structured and well tested.

The main remaining risk is not basic feature implementation. It is production reliability around payments, persistence, notifications, concurrency, deployment, and external-service verification. Before accepting real customer payments, the application needs fail-closed production configuration, retry-safe PayPal webhook processing, concurrency-safe Duffel order finalization, reliable notification dispatch, synchronized database migrations, and automated end-to-end testing against sandbox services.

## Verification baseline

The following checks were run during the audit:

- 42 test files passed.
- 176 tests passed.
- TypeScript type checking passed.
- ESLint passed.
- The production build did not complete because Google Fonts could not be downloaded during the build.
- The dependency vulnerability audit could not reach the registry audit endpoint and therefore remains unverified.
- The PayPal v6 guest-card implementation and its tests were uncommitted at the time of the audit.

The test suite gives strong confidence in internal domain behavior. Most third-party boundaries are mocked, so it does not yet prove that PostgreSQL, Clerk, Duffel, PayPal, and Resend work together under real deployment conditions.

## Feature readiness matrix

| Area | Status | Assessment |
|---|---|---|
| One-way and return search | Solid | Validation, mapping, prefill, place search, and UI tests exist. |
| Multi-city search | Mostly solid | Supports 2–6 legs with correct labels and selection progression. Real Duffel runtime testing is still manual. |
| Fare results | Solid | Pagination, sorting, stops, airline, flight-number, and time filters are implemented. |
| Fare review | Solid | Fare conditions, baggage summaries, expiry handling, and selection validation are covered. |
| Pricing | Solid internally | Rule engine, quote ownership, TTL, consumption, and amount calculation have good tests. |
| Seats and bags | Implemented | Duffel Components integration is present for pay-now checkout. External sandbox coverage is missing. |
| Hold booking | Implemented, incomplete product loop | Creates `pay_later` Duffel orders, but there is no in-app workflow to pay an existing held booking later. |
| PayPal wallet | Implemented but needs hardening | Server-side order creation, capture, amount verification, failure, and reconciliation states exist. |
| Guest card payment | Work in progress | The PayPal v6 card work is currently uncommitted, although its tests pass. |
| Clerk authentication | Mostly solid | Current Clerk v7 server APIs, protected routes, signed guest sessions, and user mirroring are implemented. |
| Signed-in bookings list | Implemented | Filtering, sorting, pagination, and ownership enforcement exist. |
| Guest booking lookup | Implemented with scaling limitation | Signed access cookies and email verification are good; rate limiting is only in memory. |
| Booking detail | Partially complete | Displays stored booking snapshots, payment state, and notification history. Live Duffel refresh does not update the returned view. |
| Email notifications | Structurally implemented | Outbox, retries, and Resend provider exist, but several operational problems remain. |
| Cancellation/change/refund | Not implemented | Conditions are displayed, but there are no customer actions or backend workflows. |
| Production operations | Incomplete | No CI workflow, external E2E suite, durable telemetry, deployment checks, or reconciliation console was found. |

## What is already solid

### Architecture and code quality

- Domain, server, and UI concerns are separated into modules.
- Zod validation is consistently used at external and user-input boundaries.
- Next.js 16 asynchronous request APIs are handled correctly.
- Server Components are used for page reads and Server Actions for application mutations.
- External webhook endpoints are implemented as route handlers.
- User-facing flow errors are generally mapped to safe, understandable messages.
- Checkout and results flows have loading, error, expiry, and recovery states.

### Search, results, and review

- One-way, return, and multi-city journeys are modeled.
- Airport and city suggestions are normalized and deduplicated.
- Passenger and itinerary validation is comprehensive.
- Results support sorting, pagination, airline filtering, stop filtering, flight-number filtering, and time filtering.
- Multi-leg selections are validated against missing, duplicate, and excessive selections.
- Offer expiry is surfaced in the UI.
- Fare conditions and baggage allowances are normalized into customer-facing view models.

### Pricing and checkout validation

- Pricing rules support scoped percentage and fixed adjustments.
- Quotes store net and sell amounts separately.
- Quotes have ownership, expiry, status, and consumption checks.
- Checkout validates that the quote, offer, selected partial offers, and actor still match.
- Traveler data and identity-document requirements are validated before order creation.
- PayPal capture amounts and currencies are compared with the expected checkout values.
- Reconciliation states exist for captured payments that cannot be safely finalized.

### Authentication and booking access

- Clerk authentication uses current server-side APIs.
- Guest sessions and guest booking-access cookies are HMAC signed.
- Signed-in booking lists enforce application-user ownership.
- Guest lookup compares normalized email hashes using constant-time comparison.
- Booking references and important provider/session identifiers have database uniqueness constraints.

## Critical production blockers

### P0-1: Database configuration fails open to memory

When `DATABASE_URL` is missing, the database client returns `null` and the repositories use process-local maps. This affects users, guest sessions, quotes, checkout sessions, webhook events, flight orders, and notification outbox records.

**Impact:** A real booking or captured payment can disappear after a restart or be unavailable on another server instance.

**Required change:**

- Allow in-memory repositories only in explicit development and test environments.
- Validate `DATABASE_URL` at production startup.
- Make checkout, capture, webhook, and order-management operations fail closed if durable persistence is unavailable.
- Add a production health check that verifies database connectivity and required migrations.

**Definition of done:** A production process cannot start or accept booking/payment mutations without a healthy, migrated PostgreSQL database.

### P0-2: PayPal events are recorded as processed before processing succeeds

The event is inserted into `payment_webhook_events` before checkout-session resolution and payment finalization complete. A failed first attempt can therefore cause a PayPal retry to be ignored as a duplicate.

**Impact:** A valid captured payment may remain unresolved even though PayPal continues retrying the webhook.

**Required change:**

- Add webhook states such as `received`, `processing`, `processed`, and `failed`.
- Store attempt count, next retry time, last error, and completion time.
- Mark an event `processed` only after its business transition succeeds.
- Permit failed or abandoned events to be retried safely.
- Add tests for failure before session resolution, during amount validation, and during Duffel finalization.

**Definition of done:** Replaying the same PayPal event after any recoverable failure completes the intended state transition exactly once.

### P0-3: Payment capture and Duffel finalization are not concurrency-safe

Client capture processing and webhook processing can attempt to finalize the same checkout session. The current flow creates an external Duffel order before all local state is finalized, without an atomic worker claim.

**Impact:** Two workers could create more than one external Duffel order even though database constraints prevent two local flight-order rows.

**Required change:**

- Add an atomic `payment_authorized -> finalizing` transition.
- Use compare-and-swap, row locking, or a durable job claim so only one worker can finalize.
- Record a stable finalization/idempotency key before calling Duffel.
- On retry, query existing local and provider state before creating another order.
- Add simultaneous capture/webhook integration tests.

**Definition of done:** Concurrent capture actions and webhook deliveries create no more than one Duffel order and one local flight order.

### P0-4: Notification delivery can be falsely marked as sent

When `RESEND_API_KEY` is missing, the notification provider returns success with a null message ID. The outbox dispatcher then marks the record as sent.

**Impact:** Customers can miss confirmation or reconciliation emails while internal records claim delivery succeeded.

**Required change:**

- Fail closed when email is required but Resend is not configured.
- Add a distinct `configuration_error` or `skipped` state if deliberate no-email development mode is needed.
- Store provider message IDs for successful sends.
- Treat missing provider confirmation as failure, not delivery.

**Definition of done:** A notification is marked `sent` only after Resend accepts it and returns a provider message identifier.

### P0-5: Notification job authentication conflicts with Clerk

The notification job route expects `x-dispatch-secret`, but Clerk middleware protects it as an authenticated application route. If Clerk is disabled, the dispatch route permits requests when its secret is absent.

**Required change:**

- Exclude the notification job route from Clerk protection.
- Require `NOTIFICATIONS_DISPATCH_SECRET` unconditionally in production.
- Compare secrets safely and return `401` for missing or invalid credentials.
- Document the scheduler request and headers.

**Definition of done:** The configured scheduler can call the endpoint, unauthenticated public requests cannot, and the endpoint refuses to run without a production secret.

### P0-6: Database migration history and snapshots are not synchronized

The migration journal contains `0001_post_booking_core`, but the corresponding Drizzle schema snapshot is absent. A schema-generation check attempted to create an additional migration instead of reporting a clean state.

**Required change:**

- Reconcile the current TypeScript schema, SQL migrations, journal, and snapshots.
- Test migration from an empty database.
- Test upgrade from a database containing only migration `0000`.
- Add migration-drift verification to CI.

**Definition of done:** Migration generation produces no unexpected SQL from an unchanged schema, and both fresh and upgrade migration tests pass.

### P0-7: Production builds depend on Google Fonts being reachable

The application uses `next/font/google`, and the audited production build failed while fetching the fonts.

**Required change:**

- Store approved font files in the repository and load them using `next/font/local`, or provide a verified build environment with dependable font access.
- Run the build in CI from a clean dependency cache.

**Definition of done:** A clean, network-restricted production build completes successfully.

## Feature-by-feature roadmap

### 1. One-way and return search

**Current state:** Solid.

**Next work — P1:**

- Add Playwright journeys for one-way and mirrored return searches.
- Verify timezone-sensitive departure-date behavior near midnight.
- Test maximum passenger combinations against Duffel sandbox behavior.
- Add analytics for search validation failures and upstream failures.

**Later — P2:**

- Recent-search history and saved searches.
- Flexible-date search if supported by the selected Duffel flow.
- Nearby-airport and airport-area discovery.

**Definition of done:** The same searches pass domain tests, browser E2E tests, and Duffel sandbox verification without manual intervention.

### 2. Multi-city search

**Current state:** Mostly solid; runtime verification is manual.

**Next work — P1:**

- Automate the existing 3-leg runtime checklist.
- Add 2-leg and 6-leg boundary scenarios.
- Test invalid chronology, repeated airports, expired intermediate offers, and supplier timeouts.
- Confirm selection restoration when navigating backward between legs.

**Later — P2:**

- Reorderable legs.
- Better per-leg editing without restarting the whole search.
- Multi-city saved itinerary templates.

**Definition of done:** Automated E2E coverage proves search, all leg selections, review, checkout, and post-booking display for at least one 3-leg sandbox itinerary.

### 3. Fare results

**Current state:** Solid internally.

**Next work — P1:**

- Add browser tests for every filter and sort combination.
- Verify cursor pagination does not duplicate or omit offers.
- Measure results-page latency and identify slow supplier responses.
- Persist filter state when moving between legs and returning from review.
- Add empty-state coverage for every major filter.

**Later — P2:**

- Compare selected offers side by side.
- Price, duration, and departure-time recommendation badges.
- Optional alerts for expiring or materially changed fares.

**Definition of done:** Results remain correct across pagination, filter combinations, navigation, and offer expiry under automated browser tests.

### 4. Fare review

**Current state:** Solid.

**Next work — P1:**

- Verify conditions against representative live Duffel offers.
- Add explicit price-change handling between review and checkout.
- Improve customer wording when refund/change information is unavailable.
- Add accessibility checks for conditions, itinerary sections, and checkout CTA state.

**Later — P2:**

- Fare-family comparison.
- Clearer airline-specific restrictions.
- Downloadable or printable pre-booking itinerary summary.

**Definition of done:** Review data matches the selected provider offer and any price/availability change is surfaced before the customer commits.

### 5. Pricing

**Current state:** Solid internally; lacks operational administration.

**Next work — P1:**

- Add PostgreSQL integration tests for rule selection, quote creation, expiry, and consumption.
- Make quote consumption atomic with checkout finalization.
- Add audit history for pricing-rule changes.
- Verify currency rounding for every supported charge currency.
- Define behavior when no pricing rule matches.

**Later — P2:**

- Internal pricing-rule management UI.
- Rule preview/simulation before activation.
- Versioned rule deployment, approval, rollback, and reporting.

**Definition of done:** Pricing decisions are reproducible, auditable, currency-safe, and cannot be consumed by more than one completed checkout.

### 6. Seats and bags

**Current state:** Implemented for pay-now checkout.

**Next work — P1:**

- Run sandbox E2E tests for seat and bag selection.
- Verify ancillary prices are recalculated on the server.
- Test services that expire, become unavailable, or change price before order creation.
- Persist selected services in booking snapshots and display them accurately post-booking.
- Add clear fallback behavior when seat maps cannot load.

**Later — P2:**

- Post-booking bag purchase.
- Post-booking seat changes where supported.
- Better seat-map accessibility and mobile presentation.

**Definition of done:** Selected ancillaries, charged amounts, Duffel order services, and booking-detail display match exactly.

### 7. Hold booking and pay later

**Current state:** Hold creation is implemented; later payment is missing.

**Next work — P1:**

- Show payment deadline and price-guarantee deadline prominently.
- Add a `Complete payment` action for eligible held orders.
- Re-fetch the live Duffel order before payment.
- Handle expired holds, changed prices, and cancelled provider orders.
- Send scheduled payment reminders before expiry.
- Define whether held orders can add ancillaries before payment.

**Later — P2:**

- Customer-requested hold cancellation.
- Configurable reminder schedule.
- Support-agent tools for extending or replacing a hold where permitted.

**Definition of done:** A customer can create a hold, return later, pay safely before expiry, and receive an updated confirmed booking without support intervention.

### 8. PayPal wallet

**Current state:** Implemented but not sufficiently hardened.

**Next work — P0/P1:**

- Complete the webhook and finalization safety work described in the production blockers.
- Add sandbox tests for create, approval, capture, cancellation, denial, refund, duplicate webhook, delayed webhook, and amount mismatch.
- Verify the displayed currency and charged currency for every supported itinerary currency.
- Add explicit timeouts and safe retry messaging.
- Store provider debug IDs and correlation IDs for support investigation.

**Later — P2:**

- Formal refund processing workflow.
- Payment-status timeline in the customer and support views.
- Automated reconciliation where provider state is unambiguous.

**Definition of done:** Every payment outcome reaches one durable terminal or recoverable state, and duplicate callbacks cannot duplicate charges or Duffel orders.

### 9. Guest card payment

**Current state:** Work in progress on PayPal v6.

**Next work — P1:**

- Finish and commit the current card implementation and tests.
- Verify PayPal v6 card eligibility in supported countries, currencies, and browsers.
- Test validation errors, 3-D Secure/challenge flows, cancellation, recoverable errors, and non-recoverable errors.
- Confirm wallet-only, card-only, both-eligible, and neither-eligible UI states.
- Add browser E2E tests using PayPal sandbox test cards.

**Later — P2:**

- Track conversion and failure rates separately for wallet and guest-card methods.
- Add additional payment methods only after the shared payment state machine is proven.

**Definition of done:** Guest card checkout is committed, documented, sandbox-verified, observable, and covered by full-browser tests.

### 10. Clerk authentication

**Current state:** Mostly solid.

**Next work — P1:**

- Add E2E tests for sign-up, sign-in, sign-out, redirect-back, and protected bookings access.
- Add route-level tests for public webhooks and protected application routes.
- Test user webhook duplicates, out-of-order updates, and deletion.
- Verify production behavior when only one Clerk key is configured.
- Review whether pending Clerk session tasks require dedicated routing.

**Later — P2:**

- Account profile and traveler profile management.
- Organization functionality only if the product will support teams or corporate travel.
- Account deletion and data-retention workflows.

**Definition of done:** Authentication, user mirroring, guest-to-user linking, and protected-route behavior are proven through browser and webhook integration tests.

### 11. Signed-in bookings list

**Current state:** Implemented.

**Next work — P1:**

- Add browser tests for filters, search, sorting, pagination, and unauthorized access.
- Add useful statuses for cancelled, refund pending, and change pending when those workflows exist.
- Verify query performance with realistic booking volumes.
- Add loading and empty states for all filters.

**Later — P2:**

- Saved travelers and repeat-booking shortcuts.
- Downloadable receipts and itineraries.
- Organization/team booking views if B2B is introduced.

**Definition of done:** Customers can find any owned booking quickly, and database queries remain efficient at expected production volume.

### 12. Guest booking lookup

**Current state:** Secure basic implementation with a non-distributed rate limiter.

**Next work — P1:**

- Replace the process-local limiter with Redis, a database-backed limiter, or an infrastructure rate-limit service.
- Normalize trusted proxy/IP handling for the deployment platform.
- Add limits by IP, booking reference, and normalized email hash.
- Add security event metrics without logging raw email addresses.
- Test multiple application instances and process restarts.

**Later — P2:**

- Optional email one-time code for higher-risk access.
- Customer-friendly recovery when the contact email was entered incorrectly.

**Definition of done:** Brute-force protection is consistent across all production instances and remains effective after deployments or restarts.

### 13. Booking detail and live synchronization

**Current state:** Stored snapshot display works; live refresh is functionally incomplete.

**Next work — P1:**

- Map a fetched Duffel order into the booking-detail model.
- Persist the refreshed provider snapshot and relevant normalized status fields.
- Show refresh time, provider status, payment deadline, services, and meaningful status changes.
- Handle provider order-not-found and terminal cancellation states.
- Add tests proving the visible view changes after refresh.

**Later — P2:**

- Scheduled background synchronization.
- Customer-visible flight schedule changes.
- Timeline of booking, payment, notification, change, cancellation, and refund events.

**Definition of done:** Refreshing a booking updates both durable local state and the customer-visible booking view from authoritative provider data.

### 14. Email notifications

**Current state:** Outbox structure exists; operational safety is incomplete.

**Next work — P0/P1:**

- Correct missing-provider behavior and scheduler authentication.
- Add row claiming or leases so multiple dispatchers cannot send the same record.
- Add provider message IDs, attempt history, and dead-letter handling.
- Add tests for retries, permanent failure, duplicate dispatch, and provider timeout.
- Add scheduled dispatch rather than relying mainly on request-path sending.
- Add email previews and template tests.

**Later — P2:**

- Payment reminder, cancellation, refund, schedule-change, and support-update templates.
- Customer notification preferences where legally and operationally appropriate.
- Delivery webhook processing from the email provider.

**Definition of done:** Every notification is durably queued, delivered at most once under concurrent workers, retryable, and observable through provider delivery status.

### 15. Cancellation, change, and refund workflows

**Current state:** Not implemented; only fare conditions are displayed.

**Next work — P2:**

- Define which actions are self-service and which create support requests.
- Model change/cancellation/refund requests and their state transitions.
- Re-fetch live provider conditions before presenting eligibility or price.
- Require explicit confirmation of penalties, residual value, and refund timing.
- Add staff approval/reconciliation tools for non-automatic cases.
- Add signed audit events and customer notifications.

**Suggested delivery order:**

1. Cancellation request with support review.
2. Refund-status tracking.
3. Automated cancellation for clearly eligible sandbox cases.
4. Flight-change quote and customer acceptance.
5. Fully automated change processing only after provider behavior is well understood.

**Definition of done:** Every request has an auditable state, authoritative provider result, financial reconciliation, and customer communication; retries cannot repeat the external action.

### 16. Production operations

**Current state:** Incomplete.

**Next work — P0/P1:**

- Add CI for install, lint, typecheck, tests, production build, migration drift, and secret scanning.
- Add staging and production environment validation.
- Add Playwright E2E suites and sandbox smoke tests.
- Add structured telemetry for search, quote, checkout, capture, finalization, webhook, notification, and reconciliation outcomes.
- Add alerting for captured-but-unbooked payments, failed webhooks, notification backlog, and database errors.
- Add a reconciliation/support console with restricted access.
- Define database backup, restoration, retention, and incident-response procedures.
- Add security headers, Content Security Policy, and dependency auditing.

**Later — P2:**

- Load testing and capacity planning.
- Multi-region and disaster-recovery design if traffic justifies it.
- Product analytics, funnel reporting, and service-level objectives.

**Definition of done:** Every deployment is automatically verified, critical failures alert an operator, payments can be reconciled, and recovery procedures are documented and tested.

## Delivery milestones

### Milestone 0 — Payment-safe foundation

Complete before taking unrestricted real payments:

1. Durable database required in production.
2. Retry-safe PayPal webhook state model.
3. Concurrency-safe checkout finalization.
4. Correct notification delivery semantics and scheduler authentication.
5. Reconciled Drizzle migrations.
6. Reproducible production build.
7. CI quality gates.

### Milestone 1 — Controlled production beta

Complete before inviting a meaningful customer cohort:

1. PayPal wallet and guest-card sandbox E2E coverage.
2. Duffel E2E coverage for one-way, return, multi-city, hold, seats, and bags.
3. Distributed guest-lookup rate limiting.
4. Durable telemetry and alerts.
5. Reconciliation/support console.
6. Reliable scheduled notification dispatch.
7. Live booking synchronization.

### Milestone 2 — Complete booking lifecycle

1. Pay held bookings.
2. Hold expiry reminders and handling.
3. Cancellation request and refund tracking.
4. Flight-change workflow.
5. Post-booking seats and bags where supported.
6. Receipts and downloadable itineraries.

### Milestone 3 — Scale and optimization

1. Performance and load testing.
2. Pricing administration and audit tools.
3. Customer profiles and saved travelers.
4. Organization features if B2B is confirmed.
5. Product funnel analytics and service-level objectives.

## Recommended priority backlog

| Priority | Work item | Primary risk addressed |
|---|---|---|
| P0 | Require durable database in production | Lost orders and payment state |
| P0 | Fix webhook processed-state timing | Lost PayPal retries |
| P0 | Add atomic finalization claim | Duplicate Duffel orders |
| P0 | Fix notification success semantics | Missing customer emails |
| P0 | Fix notification job authentication | Unreachable or exposed scheduler |
| P0 | Reconcile Drizzle migrations | Failed or unsafe deployments |
| P0 | Make production build reproducible | Release failure |
| P0 | Add CI quality gates | Regression entering production |
| P1 | Finish PayPal v6 guest card | Incomplete payment method |
| P1 | Add PayPal/Duffel sandbox E2E | Unverified external integrations |
| P1 | Add reconciliation console and alerts | Unhandled captured payments |
| P1 | Add distributed lookup rate limiting | Brute-force and scaling risk |
| P1 | Make booking refresh update state | Stale booking information |
| P1 | Complete held-order payment | Incomplete hold lifecycle |
| P2 | Add cancellation/refund workflow | Incomplete post-booking lifecycle |
| P2 | Add flight changes and post-booking extras | Incomplete booking management |
| P2 | Add pricing/admin/customer enhancements | Operational efficiency and growth |

## Release decision

### Suitable now

- Internal demonstrations.
- Developer and stakeholder testing.
- Controlled sandbox testing.
- Limited non-production usability validation.

### Not suitable yet

- Unrestricted live payment traffic.
- A multi-instance deployment without durable configuration enforcement.
- Operational use without payment reconciliation and alerting.
- Promising customers self-service payment of holds, cancellations, changes, or refunds.

## Completion standard for production readiness

The project should be considered production-ready for real-money flight bookings only when all of the following are true:

- All P0 work is complete.
- Clean CI passes from a fresh environment.
- Fresh and upgrade database migrations pass.
- PayPal and Duffel sandbox E2E suites pass reliably.
- Concurrent and duplicate payment callbacks are proven safe.
- Captured-but-unbooked payments generate immediate alerts and appear in a reconciliation console.
- Notification delivery and retry behavior are observable and tested.
- Backup restoration and incident-response procedures have been exercised.
- A controlled beta has completed without unresolved payment or order consistency issues.

