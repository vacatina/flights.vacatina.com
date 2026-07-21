# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## Authentication (Clerk)

Set the following environment variables before using hosted sign-in/sign-up:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
AUTH_GUEST_SESSION_SECRET=change-me
```

Optional:

```bash
AUTH_GUEST_SESSION_COOKIE_NAME=guest_session
AUTH_GUEST_SESSION_TTL_MS=2592000000
```

## PayPal checkout

Set these variables to enable PayPal Checkout pay-now flow:

```bash
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...

# Runtime tuning
PRICING_QUOTE_TTL_MS=600000
CHECKOUT_SESSION_TTL_MINUTES=30
ANCILLARY_MARKUP_RATE_PERCENT=0
ANCILLARY_MARKUP_FIXED_AMOUNT=0
DB_POOL_MAX=10
DUFFEL_DEFAULT_MAX_CONNECTIONS=2
DUFFEL_SUPPLIER_TIMEOUT_MS=10000
DUFFEL_RESULTS_PAGE_SIZE=20

# Feature/debug flags
FLIGHTS_DEBUG=false
NEXT_PUBLIC_FLIGHTS_DEBUG=false
```

PayPal checkout runs through Smart Buttons on the existing checkout pay step:

```text
Webhook: /api/webhooks/payments/paypal
Webhook worker: POST /api/jobs/payments/webhooks/process
Fulfillment outbox worker: POST /api/jobs/payments/outbox/process
QStash fulfillment endpoint: POST /api/jobs/payments/outbox/fulfill
Reconciliation worker: POST /api/jobs/payments/reconcile
```

Server-side PayPal capture is authoritative for payment authorization. Completed captures enqueue a durable `fulfill_flight_order` payment outbox task and publish a QStash job for that payment attempt. Duffel order creation runs from the outbox fulfillment endpoint/worker so duplicate capture callbacks, queue retries, cron runs, and webhook replays share one fulfillment key. Webhooks are verified into a payment inbox first, and reconciliation can repair completed PayPal captures that missed normal webhook or browser callback processing.

Production payment jobs need:

```bash
PAYMENTS_PUBLIC_BASE_URL=https://your-production-domain.example
PAYMENTS_JOB_SECRET=...
CRON_SECRET=...
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
```

QStash signs `/api/jobs/payments/outbox/fulfill`, and `PAYMENTS_JOB_SECRET` is forwarded as an extra header. Vercel Cron calls the batch worker routes in `vercel.json` as a fallback and uses `Authorization: Bearer $CRON_SECRET`.

PayPal v1 is intentionally limited to immediate capture through PayPal Checkout. Subscriptions, payouts, disputes, and custom refund workflows are out of scope.

Multi-city search is enabled by default and supports 2 to 6 legs.
For labeling: 2-leg mirrored journeys render `Outbound`/`Inbound`; 3+ legs render `Leg 1..N`.
Manual verification steps: `docs/search/multi-city-runtime-checklist.md`.

## Post-booking lookup + notifications

Optional configuration for booking lookup security and transactional emails:

```bash
# Guest booking lookup token/hash secrets (falls back to AUTH_GUEST_SESSION_SECRET when omitted)
BOOKING_LOOKUP_TOKEN_SECRET=
BOOKING_EMAIL_HASH_SECRET=
BOOKING_LOOKUP_TOKEN_COOKIE_NAME=booking_lookup_access
BOOKING_LOOKUP_TOKEN_TTL_MS=900000

# Guest lookup rate limiting
BOOKING_LOOKUP_RATE_LIMIT_WINDOW_MS=300000
BOOKING_LOOKUP_RATE_LIMIT_MAX_ATTEMPTS=6

# Resend transactional emails
RESEND_API_KEY=
RESEND_FROM_EMAIL=Vacatina Flights <bookings@vacatina.com>

# Notifications dispatcher endpoint protection + retry tuning
NOTIFICATIONS_DISPATCH_SECRET=
NOTIFICATIONS_DISPATCH_BATCH_LIMIT=25
NOTIFICATIONS_DISPATCH_MAX_ATTEMPTS=5
NOTIFICATIONS_DISPATCH_RETRY_DELAY_MS=300000
```
