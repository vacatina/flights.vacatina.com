# Duffel Sandbox Flight-Change Validation

> Last validated: 2026-08-15
>
> Purpose: preserve the observed supplier behavior that must guide future flight-change implementation. This is a sandbox validation record, not a source of customer data. Do not add access tokens, passenger details, email addresses, telephone numbers, or live/sandbox resource IDs here.

## Validated end-to-end path

The following supplier sequence was run successfully against a paid Duffel sandbox order:

1. `GET /air/orders/{order_id}`
2. `POST /air/order_change_requests`
3. Read/select an order-change offer.
4. `POST /air/order_changes`
5. `GET /air/order_changes/{order_change_id}`
6. `POST /air/order_changes/{order_change_id}/actions/confirm`

The original order:

- was a sandbox (`live_mode: false`) instant order;
- was paid;
- advertised `change` in `available_actions`;
- had one future slice with `changeable: true`;
- had a change-before-departure condition with a USD 30.00 penalty.

The replacement search changed the original Colombo-to-Dubai journey to Colombo-to-Singapore on a later date. Duffel returned a valid offer and then a pending order change with:

- `change_total_amount: "125.00"`;
- `change_total_currency: "USD"`;
- `penalty_total_amount: "25.00"`;
- `new_total_amount: "249.51"`.

Confirming that pending change with a Duffel balance payment of USD 125.00 succeeded. The response contained a non-null `confirmed_at`, which is the supplier-side success condition. It is safe to treat this as a confirmed airline itinerary change only after refreshing the live order and persisting the updated snapshot locally.

## Required application behavior

### Positive amount (`change_total_amount > 0`)

1. Customer selects an offer.
2. Create and display the pending Duffel change; this is the authoritative final quote.
3. Collect the customer-facing difference through PayPal.
4. After PayPal capture, confirm the Duffel change with Vacatina's approved Duffel payment method (normally balance) for exactly the latest positive supplier amount and currency.
5. Re-fetch the live order, persist its snapshot, then mark the change complete.

Never confirm from an offer price alone. Re-fetch the pending change immediately before payment/confirmation and reject expired, confirmed, currency-changed, or amount-changed resources.

### Zero amount (`change_total_amount === 0`)

- Customer needs no PayPal payment.
- Confirm the pending order change without a Duffel payment object.
- This must be tested with a separate, genuinely zero-priced pending change.

### Negative amount (`change_total_amount < 0`)

- Do not charge the customer.
- Present the proposed itinerary and estimated refund to the customer, then create an `admin_review_required` case.
- After admin approval, revalidate and confirm the pending Duffel change without a Duffel payment object.
- Duffel returns the supplier-side refund to the `refund_to` destination reported on the change.
- Vacatina must separately refund the customer through the original PayPal capture, with an auditable idempotency key.
- If airline confirmation or PayPal refund cannot be proven safe, move the case to reconciliation/manual processing. Do not ask the customer to pay again.

## Important testing correction

Do not run a no-payment confirmation request against a positive-price pending change.

During validation, a pending change with `change_total_amount: "125.00"` was first successfully confirmed with a balance payment. Replaying confirmation without `payment` returned a validation error that `payment` was required. That result does **not** prove payment is required for zero or negative changes: it was the wrong pending resource for that test.

Use distinct pending changes for each pricing scenario:

| Scenario | Required Duffel confirmation payload |
| --- | --- |
| Positive | `data.payment` with the current positive amount/currency and approved supplier payment type |
| Zero | `data: {}` |
| Negative | `data: {}` after admin approval |

## Post-booking baggage validation

`GET /air/orders/{order_id}/available_services` returned an empty array for the validated order. It already included checked baggage from the original booking.

Consequences:

- Do not show a purchasable baggage option merely because the booking exists.
- Only render services returned by the live `available_services` endpoint.
- If the list is empty, show an informative unavailable state and a manual-support fallback.
- Do not call `POST /air/orders/{order_id}/services` with a placeholder/stale service ID. The attempted call correctly returned an unsupported-operation error.

When available services do exist, add only the returned service IDs and use the amount/currency derived from the selected live services. Revalidate immediately before payment and before supplier fulfillment.

## UI and state-machine implications

- A flight is eligible for online change only when the **live** order exposes the relevant slice as `changeable` and it has not departed.
- The change search must let the customer choose the affected slice; never silently default to the first eligible slice.
- Keep the original booking's passengers fixed for an itinerary change. Duffel carries them into the change; this is not a new booking flow.
- Quote states must visibly distinguish `payment_pending`, `admin_review_required`, `manual_processing`, `reconciliation_required`, and `completed`.
- A `confirmed_at` response from Duffel does not replace the local persistence step. If snapshot persistence fails after supplier confirmation, record reconciliation required.

## Related implementation and test assets

- Duffel adapter: `modules/flights/changes/server/duffel.ts`
- Change orchestration: `modules/flights/changes/server/service.ts`
- PayPal/change payment bridge: `modules/flights/payments-adapter/change-payment-service.ts`
- Importable API test collection: `postman/duffel-flight-changes.postman_collection.json`
- Duffel documentation: <https://duffel.com/docs/api/order-changes>

