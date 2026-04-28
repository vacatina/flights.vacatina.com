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

## PayHere checkout

Set these variables to enable PayHere pay-now checkout:

```bash
PAYHERE_MERCHANT_ID=
PAYHERE_MERCHANT_SECRET=
PAYHERE_APP_BASE_URL=https://your-domain.com
PAYHERE_SANDBOX=true
PAYHERE_NOTIFY_URL=
PAYHERE_RETURN_URL=
PAYHERE_CANCEL_URL=
PAYHERE_SCRIPT_URL=https://www.payhere.lk/lib/payhere.js
PAYHERE_FX_BUFFER_PERCENT=3
PAYHERE_MARKUP_RATE_PERCENT=0
PAYHERE_MARKUP_FIXED_LKR=0
PAYHERE_TEST_FIXED_AMOUNT_LKR=


# If empty, code auto-builds notify URL as: PAYHERE_APP_BASE_URL + /api/payments/payhere/notify
PAYHERE_NOTIFY_URL=
PAYHERE_RETURN_URL=https://your-domain.com/results
PAYHERE_CANCEL_URL=https://your-domain.com/results

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
