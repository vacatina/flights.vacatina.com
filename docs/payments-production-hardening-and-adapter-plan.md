# Payments Production Hardening And Adapter Plan

## Goal

Make the current payment flow safe for real-money production traffic while keeping the shared `modules/payments` engine reusable for future product modules such as `hotels`.

This plan covers three connected decisions:

1. Add safe worker leases for payment jobs.
2. Add a single atomic finalization gate before external fulfillment.
3. Freeze the shared payments engine behind adapter contracts so future product work does not keep editing `modules/payments`.

## Current Risk

### 1. Claiming is not production-safe

The payment outbox currently uses a `pending -> processing` status change. That is the right first shape, but it is incomplete for production because it does not include a durable lease.

Two failure modes need to be fixed:

- Racing workers must not both believe they own the same task.
- A worker that crashes after claiming a task must not leave the task stuck in `processing` forever.

### 2. Finalization is not atomic

Payment capture and order fulfillment can be reached by multiple entry points:

- browser callback after PayPal approval
- PayPal webhook
- QStash fulfillment retry
- cron payment outbox worker
- reconciliation worker

The dangerous section is not PayPal capture itself. The dangerous section is the external fulfillment call, currently flight/Duffel order finalization. There must be one guarded transition where only one caller can enter the finalization path.

### 3. Reuse boundary is not strict yet

The current payments module is conceptually reusable, but it still knows too much about flights:

- `PaymentInternalOrderType` only supports `flight_checkout`.
- outbox fulfillment task naming is flight-specific.
- PayPal order creation accepts flight checkout fields.
- webhook processing eventually calls flight checkout service code.
- outbox worker calls flight fulfillment directly.

For future modules like `hotels`, this must become an adapter boundary. New product modules should implement adapters. They should not fork or repeatedly edit the core payments engine.

## Non-Negotiable Boundary Rule

After this hardening work, future product-module development must not directly touch `modules/payments` for ordinary integrations.

Allowed future changes to `modules/payments`:

- adding a new payment provider
- changing the shared payment state machine
- changing shared persistence tables
- fixing a bug in the payment engine itself
- extending a documented adapter interface in a backward-compatible way

Not allowed for future modules:

- adding hotel-specific logic inside payment workers
- adding product-specific fulfillment branches inside `modules/payments`
- importing `modules/hotels` from `modules/payments`
- copying the payments module into a product module
- adding one-off task types that make the payment engine know product behavior

Future modules should touch their own adapter only, for example:

```txt
modules/hotels/payments-adapter/*
modules/flights/payments-adapter/*
```

## Phase 1: Add Leases To Payment Outbox

### Schema changes

Add lease fields to `payment_outbox`:

```txt
claimed_by text null
claim_expires_at timestamptz null
processing_started_at timestamptz null
```

Recommended indexes:

```txt
payment_outbox_claimable_idx on status, next_attempt_at, claim_expires_at
payment_outbox_claimed_idx on claimed_by, claim_expires_at
```

### Claim behavior

Replace the current claim semantics with atomic compare-and-swap behavior:

```txt
Claimable when:
  status = 'pending'
  next_attempt_at <= now
  and (claim_expires_at is null or claim_expires_at <= now)

On claim:
  status = 'processing'
  claimed_by = worker_id
  claim_expires_at = now + lease_duration
  processing_started_at = now
  updated_at = now

Return:
  claimed row only if this worker won the update
```

Use a single database `UPDATE ... WHERE ... RETURNING` statement. Do not select first and update second.

### Completion behavior

Only the worker holding the active lease can complete the task:

```txt
WHERE id = task_id
AND claimed_by = worker_id
AND status = 'processing'
AND claim_expires_at > now
```

On completion:

```txt
status = 'completed'
completed_at = now
claimed_by = null
claim_expires_at = null
```

### Failure behavior

Only the worker holding the active lease can mark failure.

Transient failure:

```txt
status = 'pending'
attempt_count += 1
last_error = error
next_attempt_at = now + backoff
claimed_by = null
claim_expires_at = null
```

Permanent failure:

```txt
status = 'failed'
attempt_count += 1
last_error = error
claimed_by = null
claim_expires_at = null
```

### Expired lease recovery

Expired `processing` rows become claimable again when:

```txt
status = 'processing'
claim_expires_at <= now
```

Either include them in the claim query or run a small recovery step that moves them back to `pending`.

### Worker ID

Generate a worker id per process/request:

```txt
payment-worker:{hostname}:{pid}:{random}
```

For serverless jobs, use a request-scoped id:

```txt
payment-worker:{route}:{timestamp}:{random}
```

### Tests

Add tests for:

- two concurrent claims for the same outbox task result in one winner
- completed tasks cannot be re-claimed
- expired `processing` task is claimable again
- unexpired `processing` task is not claimable
- worker A cannot complete worker B's lease
- transient failure clears the lease and schedules retry
- permanent failure clears the lease and does not retry

## Phase 2: Add Leases To Webhook Inbox

Apply the same lease model to `payment_webhook_inbox`.

Add fields:

```txt
claimed_by text null
claim_expires_at timestamptz null
```

Webhook inbox records should be claimable when:

```txt
status in ('received', 'failed')
next_attempt_at <= now
and (claim_expires_at is null or claim_expires_at <= now)
```

This prevents a webhook event from getting stuck forever if the worker crashes after `markProcessing`.

### Tests

Add tests for:

- duplicate webhook event is still stored once
- only one worker claims a webhook record
- expired processing webhook can retry
- processed webhook never retries
- failed webhook retries after backoff

## Phase 3: Add Atomic Finalization Gate

### State change

Add an intermediate checkout status:

```txt
payment_authorized -> finalizing -> completed
```

The state exists to protect the external fulfillment call. Only one caller should ever move a checkout session from `payment_authorized` to `finalizing`.

### Repository API

Add a method to the flight checkout session repository:

```ts
claimFinalization(input: {
  checkoutSessionId: string
  now: Date
}): Promise<CheckoutSessionRecord | null>
```

Database behavior:

```sql
UPDATE checkout_sessions
SET status = 'finalizing', updated_at = now()
WHERE id = $checkoutSessionId
AND status = 'payment_authorized'
RETURNING *
```

If the method returns `null`, the caller did not win the gate. It must re-read the session:

- `completed`: return existing order/status
- `finalizing`: exit gracefully or return "already finalizing"
- `failed` or `reconciliation_required`: return current state
- anything else: treat as not ready

### Finalization behavior

Change fulfillment to:

```txt
1. Load checkout session.
2. If completed, return existing order.
3. Atomically claim payment_authorized -> finalizing.
4. If claim failed, re-read and exit safely.
5. Call Duffel/create external order.
6. On success, mark completed.
7. On retryable failure, mark reconciliation_required or restore retryable state according to policy.
```

Do not call Duffel unless this worker won the `finalizing` claim.

### Failure policy

For failures after entering `finalizing`:

- If Duffel outcome is unknown, mark `reconciliation_required`.
- If failure is definitely retryable before any external side effect, allow retry through outbox.
- Always record enough provider/order metadata for support.

Do not blindly move `finalizing -> payment_authorized` after an unknown Duffel error. That can cause duplicate external order creation.

### Tests

Add tests for:

- two finalizers racing produce one Duffel order
- second finalizer sees `finalizing` or `completed` and exits
- already completed checkout returns existing order
- Duffel failure after finalization claim becomes reconciliation-required
- retrying reconciliation does not duplicate a completed order
- browser callback plus webhook plus outbox retry only creates one order

## Phase 4: Extract Product Payment Adapter Boundary

### Target shape

Create a shared adapter interface owned by the payments engine:

```ts
export interface PayableResourceAdapter {
  resourceType: string

  createProviderOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult>

  getResourcePaymentState(input: {
    internalOrderId: string
  }): Promise<PayableResourcePaymentState | null>

  markPaymentAuthorized(input: {
    internalOrderId: string
    provider: PaymentProvider
    providerOrderId: string
    providerCaptureId: string | null
    providerStatus: string | null
    now: Date
  }): Promise<void>

  claimFinalization(input: {
    internalOrderId: string
    paymentAttemptId: string
    now: Date
  }): Promise<PayableResourcePaymentState | null>

  fulfill(input: {
    internalOrderId: string
    paymentAttemptId: string
    provider: PaymentProvider
    providerPaymentId: string | null
    now: Date
  }): Promise<PayableResourceFulfillmentResult>

  markReconciliationRequired(input: {
    internalOrderId: string
    paymentAttemptId: string
    reason: string
    message: string
    now: Date
  }): Promise<void>
}
```

The exact interface can be adjusted during implementation, but the dependency direction must stay fixed:

```txt
product module -> registers adapter -> payments engine calls adapter
```

The payments engine must not import product modules directly.

### Adapter registry

Create a registry:

```ts
registerPaymentAdapter("flight_checkout", flightCheckoutPaymentAdapter)
getPaymentAdapter("flight_checkout")
```

For future hotels:

```ts
registerPaymentAdapter("hotel_booking", hotelPaymentAdapter)
```

The outbox task should become generic:

```txt
fulfill_paid_resource
```

Instead of:

```txt
fulfill_flight_order
```

The task payload or payment attempt already contains:

```txt
internal_order_type
internal_order_id
payment_attempt_id
```

That is enough to route to the correct adapter.

### Flight adapter

Move flight-specific behavior out of `modules/payments` and into:

```txt
modules/flights/payments-adapter/
```

The flight adapter owns:

- checkout session lookup
- flight payment state transitions
- `payment_authorized -> finalizing -> completed`
- Duffel order creation
- flight reconciliation marking
- flight-specific PayPal order description/metadata

### Hotel adapter later

When `hotels` exists, it should add:

```txt
modules/hotels/payments-adapter/
```

The hotel adapter owns:

- hotel booking/session lookup
- hotel payment state transitions
- hotel supplier reservation/confirmation
- hotel-specific reconciliation behavior
- hotel-specific PayPal order description/metadata

No hotel-specific logic should be added to `modules/payments`.

## Phase 5: Migration Strategy

### Database migration

Create a Drizzle migration that:

1. Adds outbox lease columns.
2. Adds webhook inbox lease columns.
3. Adds `finalizing` to checkout session status enum.
4. Optionally renames or supersedes `fulfill_flight_order` with `fulfill_paid_resource`.

For existing pending outbox rows:

```txt
claimed_by = null
claim_expires_at = null
processing_started_at = null
```

For stuck existing `processing` rows during deployment:

```txt
status = 'pending'
next_attempt_at = now()
last_error = 'Reset during payment lease migration'
```

Only do this if production data has been reviewed.

### Compatibility step

During migration, support both task names:

```txt
fulfill_flight_order
fulfill_paid_resource
```

Then remove the flight-specific task after all old rows are drained.

## Phase 6: Production Acceptance Criteria

This work is done only when all of these are true:

- concurrent outbox claiming has a single winner
- expired outbox leases retry automatically
- webhook inbox records cannot get stuck in `processing`
- only one caller can enter checkout finalization
- duplicate browser/webhook/cron/QStash paths create at most one external order
- captured-but-unfulfilled payments become visible as reconciliation-required
- payment engine no longer imports flight checkout fulfillment directly
- flights integrate through a payment adapter
- future hotels integration can be implemented by adding a hotel adapter only
- focused tests and full typecheck pass

## Suggested Implementation Order

1. Add outbox lease columns and repository methods.
2. Update outbox worker to use worker ids and lease-aware completion/failure.
3. Add outbox lease tests.
4. Add webhook inbox lease columns and repository methods.
5. Update webhook worker to use lease-aware processing.
6. Add webhook inbox lease tests.
7. Add `finalizing` checkout status and repository claim method.
8. Update flight checkout fulfillment to claim finalization before Duffel.
9. Add duplicate finalization tests.
10. Extract flight payment adapter.
11. Change outbox worker to route fulfillment through adapter registry.
12. Rename generic outbox task after compatibility period.

## Files Expected To Change

Payment hardening:

```txt
lib/db/schema.ts
drizzle/*
modules/payments/server/outbox-repository.ts
modules/payments/server/webhook-inbox-repository.ts
modules/payments/server/workers/outbox-worker.ts
modules/payments/server/webhooks/paypal.ts
modules/payments/server/repositories.test.ts
```

Flight finalization:

```txt
modules/flights/checkout/domain/types.ts
modules/flights/checkout/server/session-repository.ts
modules/flights/checkout/server/service-core.ts
modules/flights/checkout/server/service.test.ts
modules/flights/checkout/server/service-helpers.ts
lib/db/schema.ts
drizzle/*
```

Adapter extraction:

```txt
modules/payments/server/adapters/*
modules/flights/payments-adapter/*
modules/payments/server/workers/outbox-worker.ts
modules/payments/server/reconciliation-service.ts
modules/payments/server/providers/paypal/client.ts
```

Future hotel integration:

```txt
modules/hotels/payments-adapter/*
```

Future hotel integration should not require ordinary edits in:

```txt
modules/payments/*
```

## Open Decisions

- Lease duration: start with 5 minutes for fulfillment tasks and 1 minute for webhook processing.
- Whether `processing` remains a status or lease ownership alone represents processing.
- Whether old `fulfill_flight_order` tasks should be migrated immediately or drained through compatibility handling.
- Whether `finalizing` needs its own timestamp fields, for example `finalization_started_at`.
- Whether product adapters are registered statically at app startup or resolved through a pure map exported by product modules.

## Recommended First PR

Keep the first PR narrow:

```txt
Outbox lease columns + lease-aware outbox repository + outbox worker tests.
```

Do not combine the adapter extraction and finalization state in the first PR. The work is related, but the failure modes are easier to prove when each change is isolated.
