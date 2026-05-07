# Multi-City Runtime Verification Checklist

Use this checklist for manual end-to-end validation with a 3-leg itinerary.

## Preconditions

- `DUFFEL_ACCESS_TOKEN` points to the intended environment (sandbox/live).
- `DATABASE_URL` is configured and migrations are up to date.
- Checkout dependencies are configured (`STRIPE_*`, pricing quote/session TTL envs).

## Scenario A: Search → Fare Options Leg Progression

1. Open `/` and choose `Multi City`.
2. Add 3 legs (example):
   - `CMB -> DXB`
   - `DXB -> LHR`
   - `LHR -> SFO`
3. Submit search.
4. Confirm fare-options defaults to `leg=0`.
5. Select a fare for leg 1 and verify navigation to `leg=1` with one selected partial offer.
6. Select a fare for leg 2 and verify navigation to `leg=2` with two selected partial offers.
7. Select a fare for leg 3 and verify navigation to review with 3 selected partial offers.

## Scenario B: Review and Checkout Entry

1. On review page, verify leg headings render as `Leg 1`, `Leg 2`, `Leg 3`.
2. Verify summary route label uses first-origin to last-destination with leg count (multi-city style).
3. Select fare options per leg.
4. Click `Go to checkout` and verify checkout URL includes `offer`, `selected`, and `quote`.

## Scenario C: Checkout and Payment States

1. On checkout, verify trip summary journey type is `Multi-city`.
2. Verify selected flights render `Leg 1..N` labels (not Outbound/Inbound).
3. For `pay_now`:
   - Redirect to Stripe Checkout.
   - Complete or cancel the hosted payment flow.
   - On return, verify processing/cancelled state appears in checkout.
   - Verify final state transitions to success/reconciliation/failed per webhook outcome.
4. For `hold`:
   - Submit hold order.
   - Verify success response and booking reference generation.

## Scenario D: Post-Booking Views

1. Open `/bookings` (signed-in user) and verify booking row displays multi-city route summary.
2. Open `/booking/[bookingReference]` and verify:
   - journey type label is `Multi-city`
   - route summary matches first-origin to last-destination
   - leg titles are `Leg 1..N`.

## Regression Checks

- One-way trips still show one-leg behavior.
- Mirrored 2-leg return still shows `Outbound` and `Inbound`.
- Stripe webhook confirms or expires the checkout session without manual refresh loops breaking.
