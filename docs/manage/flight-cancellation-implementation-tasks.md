# Flight Cancellation Implementation Tasks

## Objective

Implement full-booking flight cancellation with admin approval, manual fallback, refund review, Clerk-protected admin screens, and seeded business/support settings.

Keep the build small and practical:

1. Database foundation first.
2. Customer UI, admin UI, and backend services together.
3. External integrations after the internal workflow is stable.

## Key Decisions

- Customers: signed-in users and guests can request cancellation.
- Scope: full booking only.
- Approval: every cancellation requires admin approval.
- Refund: refund approval is separate from cancellation approval.
- Duffel: use API cancellation only when `available_actions` contains `cancel`; otherwise manual processing.
- Holds: unpaid hold cancellation is separate and simpler than paid booking cancellation.
- Fees: default no fee, admin can set fixed/percentage fee per request, fee tracked internally but not shown as separate customer line item.
- Refund cap: customer refund cannot exceed original captured payment.
- Timing: admin decides cutoff/timing; departed bookings become manual support cases.
- Clerk admin access: `publicMetadata.role = "admin"` and `publicMetadata.status = "active"`.
- Cooldown: rejected request resubmission uses `FLIGHT_CANCELLATION_REJECTION_COOLDOWN_MINUTES`, default 10 minutes.
- Support details: stored in `business_settings`, seeded by default, editable in admin settings tab.
- Notifications: customer gets email for every status change; active admins get dashboard and email alerts.

## Phase 1: Database And Domain Foundation

Goal: add durable state before UI/business actions.

### Schema

Edit:

- `lib/db/schema.ts`
- new migration under `drizzle/`

Add enums:

- `flight_cancellation_status`
- `flight_cancellation_fee_type`
- `flight_refund_status`
- `flight_cancellation_event_actor_type`

Suggested cancellation statuses:

- `requested`
- `quote_pending`
- `quote_ready`
- `admin_review_required`
- `duffel_confirming`
- `duffel_cancelled`
- `manual_processing`
- `refund_pending`
- `refund_completed`
- `completed`
- `rejected`
- `failed`

Add tables:

- `flight_cancellation_requests`
- `flight_cancellation_quotes`
- `flight_refund_attempts`
- `flight_cancellation_events`
- `business_settings`

Required request fields:

- booking/order ids
- requester user/guest ids
- customer reason
- status
- Duffel API availability
- admin fee type/value/amount
- customer refund amount/currency
- customer message
- cutoff override fields
- cancellation approval fields
- refund approval fields
- rejection reason
- timestamps

Required `business_settings` fields:

- business name
- support email
- support phone
- support WhatsApp
- address
- timezone
- updated by
- timestamps

### Seed

Add a default `business_settings` seed.

Use env values if available, otherwise safe placeholder values:

- `BUSINESS_NAME`
- `SUPPORT_EMAIL`
- `SUPPORT_PHONE`
- `SUPPORT_WHATSAPP`
- `BUSINESS_ADDRESS`
- `BUSINESS_TIMEZONE`

### Domain Types

Create:

- `modules/flights/cancellations/domain/types.ts`
- `modules/flights/cancellations/domain/schema.ts`
- `modules/flights/cancellations/domain/index.ts`

Include:

- create request input schema
- admin update schema
- refund approval schema
- status transition helpers
- refund cap helper
- fee calculation helper
- rejection cooldown helper

### Tests

Add focused tests for:

- fee calculation
- refund cap
- rejection cooldown
- status transition validity
- request validation

## Phase 2: Internal Backend And UI Workflow

Goal: make the feature usable without depending on Duffel/PayPal automation.

### Backend Module

Create:

- `modules/flights/cancellations/server/service.ts`
- `modules/flights/cancellations/server/actions.ts`
- `modules/flights/cancellations/server/repository.ts`
- `modules/flights/cancellations/server/config.ts`
- `modules/flights/cancellations/server/admin-guard.ts`
- `modules/flights/cancellations/server/index.ts`

Customer service actions:

- get cancellation eligibility/context
- create cancellation request
- block duplicate active requests
- apply rejected-request cooldown
- allow departed bookings as manual support cases
- read request status for booking detail

Admin service actions:

- list cancellation requests
- get cancellation detail
- approve cancellation
- reject cancellation
- move request to manual processing
- approve refund
- mark refund manually completed
- edit customer-facing message
- update service fee
- record cutoff/timing override

Business settings actions:

- get current business settings
- update business settings from admin tab

### Admin Guard

Use Clerk server auth.

Allow admin access only when:

- `publicMetadata.role === "admin"`
- `publicMetadata.status === "active"`

Protect routes on the server before loading data.

### Customer UI

Create:

- `app/booking/[bookingReference]/cancel/page.tsx`
- `modules/flights/cancellations/ui/cancellation-request-view.tsx`
- `modules/flights/cancellations/ui/cancellation-status-panel.tsx`

Edit:

- `modules/flights/orders/ui/booking-detail-view.tsx`
- booking detail route/service if needed

Customer UI should show:

- flight summary
- passenger summary
- fare/refund conditions
- estimated fee/refund if available
- review time: within 24 hours
- support/business details for manual cases
- customer reason field
- submit button
- existing cancellation status

### Admin UI

Create:

- `app/admin/cancellations/page.tsx`
- `app/admin/cancellations/[requestId]/page.tsx`
- `app/admin/settings/page.tsx` or admin settings tab in existing admin shell
- `modules/flights/cancellations/ui/admin-cancellation-queue.tsx`
- `modules/flights/cancellations/ui/admin-cancellation-detail.tsx`
- `modules/flights/cancellations/ui/business-settings-form.tsx`

Admin queue should show:

- booking reference
- customer email
- route
- departure
- status
- Duffel API availability
- refund amount
- service fee
- latest action state

Admin detail should include:

- booking summary
- customer reason
- timing/departure warning
- Duffel order id
- fare/refund conditions
- fee/refund editor
- customer message editor
- audit trail
- actions for approve/reject/manual/refund

### Tests

Add focused tests for:

- customer request creation
- duplicate active request prevention
- rejected cooldown behavior
- admin guard
- admin status transitions
- business settings update

## Phase 3: Duffel, Refunds, And Notifications

Goal: connect external actions after the internal admin workflow is reliable.

### Duffel

Add service methods:

- fetch live Duffel order
- detect `available_actions.includes("cancel")`
- create order cancellation quote
- confirm latest cancellation quote

Persist:

- quote id
- refund amount/currency
- refund destination
- expiry
- confirmed time
- raw payload

Failure behavior:

- if API cancellation unavailable, mark manual processing
- if quote creation fails, keep admin review state and log event
- if confirm fails, keep request actionable and log event

### PayPal Refund

Extend PayPal provider:

- refund captured payment by capture id
- use idempotency key per cancellation refund
- cap amount at captured payment amount

Persist:

- provider refund id
- refund status
- raw provider payload
- failure reason

Admin should still be able to mark refund handled manually.

### Notifications

Extend notification event types:

- cancellation request received
- cancellation manual review
- cancellation quote ready
- cancellation approved
- cancellation rejected
- cancellation completed
- refund completed
- cancellation/refund issue

Customer emails:

- send on every status change
- include admin-edited customer message
- use `business_settings`

Admin alerts:

- dashboard event
- email active admins only

### Tests

Add tests for:

- Duffel API availability mapping
- quote persistence
- confirm success/failure transitions
- PayPal refund cap
- notification payload creation

## Recommended Build Order

1. Add schema and migration.
2. Add domain types/helpers/tests.
3. Add repositories and internal service.
4. Add customer request page.
5. Add admin queue/detail pages.
6. Add business settings tab and seed.
7. Add Duffel quote/create/confirm.
8. Add refund provider action.
9. Add notifications.
10. Polish booking detail status display.

## Verification

Run:

- unit tests for cancellation domain/server
- existing order/checkout tests affected by schema changes
- typecheck
- lint if already used by the repo

Manual check:

- guest booking can open cancel page
- signed-in user can open cancel page
- duplicate active request is blocked
- rejected request cooldown works
- non-admin cannot access admin pages
- active admin can access admin pages
- admin can update business settings
- request status appears on booking detail
