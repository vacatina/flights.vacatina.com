# Payments Module Refactor Plan

## Goal

Move payment behavior out of the scattered checkout/PayPal code path and into a dedicated `modules/payments` module that follows the production-ready architecture:

1. Client only starts PayPal and receives buyer approval.
2. Server validates ownership, order state, and trusted amounts.
3. Server creates durable payment attempts and immutable payment events.
4. PayPal calls use stored idempotency keys.
5. Verified webhooks go into an inbox first.
6. Workers process webhook inbox records, update payment state, and enqueue outbox tasks.
7. Reconciliation repairs missed or delayed PayPal state changes.

The end state should make duplicate payments, duplicate Duffel order creation, repeated receipts, lost webhooks, and browser-close failures much harder.

## Current Payment Code To Move Or Remove

### Move Into `modules/payments`

- `lib/paypal.ts`
  - Move provider API client logic to `modules/payments/server/providers/paypal/client.ts`.
  - Keep provider-neutral types outside PayPal-specific files.

- `app/api/webhooks/payments/paypal/route.ts`
  - Keep the route path, but make it a thin adapter that calls `modules/payments/server/webhooks/paypal`.
  - The route should verify signature and store the webhook inbox record only.
  - It should not finalize checkout or create Duffel orders directly.

- PayPal server actions from `modules/flights/checkout/server/actions.ts`
  - Move pay-now actions to `modules/payments/server/actions.ts`.
  - Checkout should call payments actions through a small interface.

- PayPal flow logic from `modules/flights/checkout/server/service-core.ts`
  - Move create/capture/webhook/payment-status logic to payment services.
  - Checkout service should keep traveler validation, quote validation, ancillary pricing, and hold-order behavior.
  - Payment finalization should call back into flights through a narrow fulfillment interface.

- PayPal UI from `modules/flights/checkout/ui/wizard/pay-step.tsx`
  - Move the PayPal button/provider/control components to `modules/payments/ui/paypal-checkout.tsx`.
  - Checkout pay step should render a provider-neutral `PaymentWidget`.

- Payment status UI from `modules/flights/checkout/ui/checkout-payment-status-view.tsx`
  - Move generic payment status rendering to `modules/payments/ui/payment-status-view.tsx`.
  - Keep flight-specific booking reference display in checkout/orders if needed.

### Keep In Flight Checkout

- Flight traveler form and validation.
- Fare/quote validation and ancillary selection.
- `hold` / pay-later checkout path.
- Duffel offer loading and passenger mapping.
- Flight order snapshot and booking detail screens.

### Remove Or Deprecate After Migration

- Direct PayPal calls from checkout service.
- `paymentWebhookEventRepository` as a "processed events" repository.
- In-place payment lifecycle fields on `checkout_sessions` as the source of truth.
- Any direct webhook-driven Duffel order creation.
- In-memory fallback for production payment state. Payment operations should fail closed when DB persistence is unavailable.

## Proposed Module Layout

```text
modules/payments/
  index.ts
  domain/
    types.ts
    status.ts
    events.ts
    schema.ts
  server/
    actions.ts
    config.ts
    service.ts
    attempts-repository.ts
    events-repository.ts
    webhook-inbox-repository.ts
    outbox-repository.ts
    reconciliation-service.ts
    workers/
      webhook-worker.ts
      outbox-worker.ts
      reconciliation-worker.ts
    providers/
      paypal/
        client.ts
        mapper.ts
        webhook.ts
        types.ts
  ui/
    payment-widget.tsx
    paypal-checkout.tsx
    payment-status-view.tsx
    hooks/
      use-payment-flow.ts
```

## Database Plan

### New Enums

Add provider-neutral enums:

- `payment_provider`: `paypal`
- `payment_attempt_status`:
  - `created`
  - `provider_order_created`
  - `buyer_approved`
  - `capture_pending`
  - `capture_completed`
  - `capture_denied`
  - `capture_failed`
  - `refunded`
  - `reversed`
  - `disputed`
  - `fulfillment_pending`
  - `fulfilled`
  - `reconciliation_required`
  - `cancelled`

- `payment_event_type`:
  - `PAYMENT_INITIATED`
  - `PROVIDER_ORDER_CREATED`
  - `BUYER_APPROVED`
  - `CAPTURE_REQUESTED`
  - `CAPTURE_COMPLETED`
  - `CAPTURE_PENDING`
  - `CAPTURE_DENIED`
  - `WEBHOOK_RECEIVED`
  - `WEBHOOK_PROCESSED`
  - `FULFILLMENT_REQUESTED`
  - `FULFILLMENT_COMPLETED`
  - `FULFILLMENT_FAILED`
  - `REFUND_DETECTED`
  - `REVERSAL_DETECTED`
  - `DISPUTE_DETECTED`
  - `RECONCILIATION_CHECKED`
  - `RECONCILIATION_REPAIRED`
  - `RECONCILIATION_REQUIRED`

- `payment_webhook_inbox_status`: `received`, `processing`, `processed`, `failed`, `ignored`
- `payment_outbox_status`: `pending`, `processing`, `completed`, `failed`
- `payment_outbox_task_type`: `fulfill_flight_order`, `send_receipt`, `notify_admin`, `sync_payment_state`

### New Tables

#### `payment_attempts`

Fast current-state view for each payment attempt.

Important columns:

- `id`
- `internal_order_type` such as `flight_checkout`
- `internal_order_id`, initially `checkout_session_id`
- `owner_user_id`
- `owner_guest_id`
- `owner_org_id`
- `provider`
- `status`
- `currency`
- `amount`
- `provider_order_id`
- `provider_capture_id`
- `provider_status`
- `create_idempotency_key`
- `capture_idempotency_key`
- `client_idempotency_key`
- `checkout_payload_snapshot`
- `last_provider_payload`
- `failure_code`
- `failure_message`
- `reconciliation_required_at`
- `next_reconciliation_at`
- `created_at`
- `updated_at`

Indexes and constraints:

- Unique `(provider, provider_order_id)` where provider order is present.
- Unique `(internal_order_type, internal_order_id, client_idempotency_key)`.
- Unique `create_idempotency_key`.
- Unique `capture_idempotency_key`.
- Index `(status, next_reconciliation_at)`.
- Index `(owner_user_id, owner_guest_id, created_at)`.

#### `payment_events`

Immutable audit history.

Important columns:

- `id`
- `payment_attempt_id`
- `event_type`
- `provider`
- `provider_event_id`
- `provider_order_id`
- `provider_capture_id`
- `amount`
- `currency`
- `payload`
- `metadata`
- `created_at`

Indexes and constraints:

- Index `(payment_attempt_id, created_at)`.
- Unique `(provider, provider_event_id, event_type)` when provider event is present.

#### `payment_webhook_inbox`

Durable webhook inbox.

Important columns:

- `id`
- `provider`
- `provider_event_id`
- `event_type`
- `provider_order_id`
- `provider_capture_id`
- `status`
- `payload`
- `headers`
- `attempt_count`
- `last_error`
- `received_at`
- `processing_started_at`
- `processed_at`
- `next_attempt_at`
- `created_at`
- `updated_at`

Indexes and constraints:

- Unique `(provider, provider_event_id)`.
- Index `(status, next_attempt_at)`.
- Index `(provider, provider_order_id, received_at)`.

#### `payment_outbox`

Payment/fulfillment task outbox.

Important columns:

- `id`
- `task_type`
- `status`
- `unique_key`
- `payment_attempt_id`
- `internal_order_type`
- `internal_order_id`
- `payload`
- `attempt_count`
- `last_error`
- `next_attempt_at`
- `created_at`
- `updated_at`
- `completed_at`

Indexes and constraints:

- Unique `unique_key`.
- Index `(status, next_attempt_at)`.
- Index `(payment_attempt_id, created_at)`.

### Existing Tables To Adjust

#### `checkout_sessions`

Short term:

- Keep existing fields for compatibility.
- Add nullable `payment_attempt_id` referencing `payment_attempts.id`.
- Continue exposing checkout status from the payment attempt where available.

Long term:

- Remove or stop writing:
  - `payment_provider`
  - `provider_order_id`
  - `provider_payment_id`
  - `provider_status_code`
  - `provider_status_message`
  - `payment_currency`
  - `payment_amount`
  - `payment_initiated_at`
  - `payment_confirmed_at`

#### `payment_webhook_events`

Replace with `payment_webhook_inbox`.

Migration options:

1. Keep the old table temporarily and stop writing to it.
2. Backfill old rows into `payment_webhook_inbox` as `processed`.
3. Drop the old table only after production confidence.

#### `flight_orders`

Keep as the fulfilled booking record. It should be created by a payment outbox worker, not inside the PayPal webhook request.

Add if useful:

- `payment_attempt_id`
- `paid_by_payment_attempt_id`

## Flow Design

### 1. Start PayPal Checkout

Client sends:

- internal order ID, currently checkout session or prepared checkout ID
- client idempotency key
- selected payment provider

Server:

1. Resolve actor.
2. Load checkout/order data.
3. Verify ownership.
4. Verify unpaid/not finalized state.
5. Recalculate trusted amount from quote + selected ancillaries.
6. Create or reuse `payment_attempts` row.
7. Insert `PAYMENT_INITIATED` into `payment_events`.
8. Call PayPal create order using stored `create_idempotency_key`.
9. Store PayPal order ID and provider response.
10. Insert `PROVIDER_ORDER_CREATED`.
11. Return only PayPal order ID and payment attempt ID.

### 2. Capture After Buyer Approval

Client sends:

- payment attempt ID
- PayPal order ID

Server:

1. Resolve actor.
2. Load payment attempt.
3. Verify ownership and provider order ID.
4. Insert `BUYER_APPROVED` if not already present.
5. Mark attempt `capture_pending`.
6. Insert `CAPTURE_REQUESTED`.
7. Call PayPal capture using stored `capture_idempotency_key`.
8. Store raw capture response.
9. Insert capture result event.
10. If capture is completed, mark attempt `capture_completed` and enqueue fulfillment task.
11. Return current payment status.

Important: capture completion should not create the Duffel order inline after the refactor. It should enqueue `payment_outbox:fulfill_flight_order`.

### 3. PayPal Webhook Request

Route:

1. Parse JSON.
2. Verify PayPal signature.
3. Insert into `payment_webhook_inbox` with unique provider event ID.
4. Return `200 OK` for duplicate already-stored events.

The route should not finalize flight bookings.

### 4. Webhook Worker

Worker:

1. Claim one or more `received` or retryable `failed` rows atomically.
2. Mark as `processing`.
3. Resolve payment attempt by provider order ID or capture ID.
4. Insert `WEBHOOK_RECEIVED`/provider-specific event into `payment_events`.
5. Update `payment_attempts.status`.
6. On `PAYMENT.CAPTURE.COMPLETED`, enqueue fulfillment task using a unique key.
7. On refund/reversal/dispute, update attempt and enqueue admin/support tasks.
8. Mark inbox row `processed`.

### 5. Fulfillment Outbox Worker

For `fulfill_flight_order`:

1. Claim task atomically by unique key.
2. Load payment attempt.
3. Verify status allows fulfillment.
4. Atomically transition attempt from `capture_completed` to `fulfillment_pending`.
5. Create Duffel order.
6. Create `flight_orders` record.
7. Mark priced quote consumed in the same DB transaction as local order insert where possible.
8. Insert `FULFILLMENT_COMPLETED`.
9. Mark payment attempt `fulfilled`.
10. Enqueue `send_receipt` notification task.

This worker is the main fix for duplicate Duffel order risk.

### 6. Reconciliation Worker

Periodic worker:

1. Find attempts in stale states:
   - `created`
   - `provider_order_created`
   - `buyer_approved`
   - `capture_pending`
   - `capture_completed` with no fulfillment task/order
   - `reconciliation_required`
2. Ask PayPal for latest order/capture status.
3. Insert `RECONCILIATION_CHECKED`.
4. Repair local status when PayPal is authoritative.
5. Create missing fulfillment/outbox tasks.
6. Escalate to `reconciliation_required` when state cannot be safely repaired.

## Implementation Phases

### Phase 1: Schema And Repositories

- Add Drizzle schema entries for payment enums/tables.
- Generate a migration.
- Add repository interfaces for attempts, events, webhook inbox, and outbox.
- Add tests for idempotent create, capture, webhook insert, and outbox unique keys.

### Phase 2: PayPal Provider Module

- Move `lib/paypal.ts` into `modules/payments/server/providers/paypal/client.ts`.
- Store create/capture request IDs in DB.
- Add provider mappers for PayPal order/capture/webhook statuses.
- Keep `lib/paypal.ts` as a temporary re-export if needed.

### Phase 3: Payment Service

- Implement `startPaymentAttempt`.
- Implement `capturePaymentAttempt`.
- Implement `getPaymentAttemptStatus`.
- Make service provider-neutral, with PayPal as the first provider.
- Update checkout UI hooks to use payment service actions.

### Phase 4: Webhook Inbox

- Replace direct webhook processing with inbox insert.
- Add `webhook-worker`.
- Handle duplicate webhook event IDs safely.
- Add tests for duplicate, failed, and retrying webhook processing.

### Phase 5: Fulfillment Outbox

- Move Duffel order creation out of PayPal capture/webhook paths.
- Add `fulfill_flight_order` outbox worker.
- Make flight order creation idempotent by payment attempt/checkout session.
- Add concurrency tests for simultaneous capture + webhook.

### Phase 6: Reconciliation

- Add reconciliation service and worker route/job entrypoint.
- Query stale payment attempts.
- Repair missing webhook/capture/fulfillment transitions.
- Add metrics and support-friendly failure metadata.

### Phase 7: Cleanup

- Remove PayPal logic from `modules/flights/checkout/server/service-core.ts`.
- Remove old `paymentWebhookEventRepository`.
- Stop writing payment provider fields on `checkout_sessions`.
- Update README and `PROJECT_TODO.md`.
- Delete compatibility re-exports only after tests and manual checkout validation pass.

## API And Route Plan

Keep or create these routes/actions:

- `POST /api/webhooks/payments/paypal`
  - Verify and store webhook inbox record.

- Server actions:
  - `startPayPalPaymentAction(input)`
  - `capturePayPalPaymentAction(input)`
  - `getPaymentStatusAction(input)`

Optional internal job routes, protected by a cron secret:

- `POST /api/jobs/payments/webhooks/process`
- `POST /api/jobs/payments/outbox/process`
- `POST /api/jobs/payments/reconcile`

## Testing Plan

### Unit Tests

- PayPal amount formatting by currency.
- PayPal status mapping.
- Payment attempt idempotency.
- Capture request idempotency.
- Payment event append-only behavior.
- Webhook inbox duplicate handling.
- Outbox unique key behavior.

### Integration Tests

- Start payment creates attempt + event + PayPal order.
- Duplicate start reuses attempt/order.
- Capture completed enqueues fulfillment task.
- Capture pending does not fulfill immediately.
- Webhook completed enqueues fulfillment once.
- Duplicate webhook does not duplicate events/tasks.
- Capture action and webhook racing creates one fulfillment task.
- Fulfillment worker creates one Duffel order and one `flight_orders` row.
- Failed Duffel fulfillment retries through outbox.
- Reconciliation repairs capture completed with missing fulfillment task.

### Manual Sandbox Tests

- PayPal wallet success.
- Guest card success.
- Buyer cancels.
- Capture denied.
- Duplicate browser approval callback.
- Browser closed after approval before capture response.
- Duplicate webhook replay.
- Simulated missed webhook repaired by reconciliation.

## Migration Safety Notes

- Do not drop old payment columns in the first migration.
- Backfill existing `checkout_sessions` with `payment_attempts` only if production data exists.
- During transition, status reads can prefer `payment_attempts` when `checkout_sessions.payment_attempt_id` exists, otherwise fall back to current checkout session fields.
- Payment operations should fail closed if DB is unavailable.
- In-memory repositories must remain test-only and should not be used by production payment paths.

## Suggested First PR

Start with schema and empty module boundaries:

1. Add payment enums and tables to `lib/db/schema.ts`.
2. Generate Drizzle migration.
3. Create `modules/payments` folder with domain types and repository interfaces.
4. Add repository tests for idempotency and append-only events.
5. Do not wire UI yet.

This keeps the first change low-risk and gives the rest of the refactor a stable foundation.
