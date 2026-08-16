# Flight Change Feature Plan

## Document Status

- Status: product and implementation plan
- Last updated: 2026-08-10
- Product: Vacatina Flights
- Primary supplier: Duffel Flights API v2
- Customer payment provider: PayPal

## Objective

Allow a customer to manage an existing paid flight booking after purchase while keeping airline changes, customer payments, and customer refunds safe and auditable.

The feature must support three handling modes:

1. Fully automated changes when Duffel supports the operation and no admin decision is required.
2. Admin-approved changes when the customer may receive money back.
3. Manual admin handling when Duffel does not expose an API for the requested operation.

The implementation should reuse the existing booking access, payment, cancellation, refund, notification, and admin-security patterns without representing a partial change as a full cancellation.

## Confirmed Product Decisions

- A seated passenger can select only one seat per flight segment.
- Two occupied seats normally mean two seated passengers, not two seats assigned to one person.
- An `infant_without_seat` is the expected exception: the infant is a passenger but does not occupy a separate seat.
- Removing one of two booked seats therefore means removing one passenger.
- Removing a passenger requires admin handling because Duffel Order Changes replace flight slices; they do not provide a standard passenger-removal endpoint.
- Removing or refunding an already-booked seat assignment requires manual admin handling.
- Removing an already-purchased baggage or other service requires manual admin handling.
- Supported itinerary changes that cost more can proceed automatically after the customer pays the difference.
- Supported itinerary changes with no price difference can proceed automatically after final customer confirmation.
- Any change that may return money to the customer requires admin approval before it is committed.
- Duffel/airline money and the PayPal customer payment are separate financial movements and must be recorded separately.
- Unsupported or failed automated operations must remain actionable in the admin area; they must never disappear into a terminal error with no recovery path.

## Terminology

### Passenger

A traveller stored on the Duffel order. A normal adult or child occupies one airline seat on each flight segment. An infant without a seat is attached to an adult and does not occupy a separate seat.

### Seat assignment

The physical seat selected for a passenger on one flight segment, such as `12A`. A seat assignment is not the same as the passenger's ticket.

### Slice

A Duffel journey unit between an origin and destination. A return booking normally has an outbound slice and an inbound slice. Duffel itinerary changes remove one or more existing slices and add replacement slices.

### Segment

An individual flight inside a slice. A connecting itinerary contains multiple segments in one slice.

### Service

An ancillary product attached to an order, passenger, or segment. Duffel currently supports post-booking additions primarily for baggage.

### Order change request

A Duffel search describing which existing slices will be removed and the criteria for replacement slices.

### Order change offer

A priced replacement itinerary returned by Duffel. It contains the flight difference and airline change penalty.

### Pending order change

The final Duffel change created from a selected offer. It has a final price and expiry and does not change the airline booking until it is confirmed.

## Scope Matrix

| Customer request | Duffel capability | Vacatina handling |
| --- | --- | --- |
| Change a supported flight date or time | Order Changes | Automated when the final difference is zero or positive |
| Change a supported route | Order Changes | Automated when the final difference is zero or positive |
| Change cabin when Duffel returns matching offers | Order Changes | Automated when the final difference is zero or positive |
| Change flight and pay an additional amount | Order Changes plus PayPal | Automated after successful customer payment |
| Change flight with no price difference | Order Changes | Automated after customer confirms the final terms |
| Change flight and receive money back | Order Changes plus PayPal refund | Admin approval, then automated confirmation/refund where possible |
| Add post-booking baggage | Available Services | Automated when Duffel offers the service and the order is eligible |
| Remove one passenger | No standard passenger-removal endpoint | Manual admin handling |
| Remove a booked seat assignment | Not supported after order creation | Manual admin handling |
| Add or replace a seat after booking | Not supported by the standard Seat Maps flow | Manual admin handling |
| Remove purchased baggage or another service | No standard service-removal endpoint | Manual admin handling |
| Change an order/slice that Duffel marks unchangeable | Unsupported | Manual admin handling |
| Change after departure | Unsupported for automatic processing | Manual admin review |
| Change when Duffel returns no offers | No automated option available | Manual admin handling or customer selects different criteria |
| Change when payment succeeds but airline confirmation fails | Recoverable operational failure | Admin reconciliation and recovery |

## Automation Boundary

### Fully Automated

An operation can be fully automated only when all of the following are true:

- The customer is authorized to access the booking.
- The order is paid and active.
- The selected slice is changeable according to the latest Duffel order.
- Duffel returns at least one valid order change offer.
- The selected offer and pending change have not expired.
- The requested operation does not remove a passenger or previously purchased service.
- The final `change_total_amount` is zero or greater.
- When additional payment is required, PayPal capture succeeds.
- Duffel confirmation succeeds.
- The refreshed Duffel order can be stored locally.

### Admin Approval Required

Admin approval is required when:

- The final `change_total_amount` is negative.
- Vacatina will return money to the customer.
- A fee or refund amount requires an operational decision.
- A timing or departure cutoff needs an override.
- The airline refund destination or amount is unclear.
- The customer payment cannot be mapped safely to a refundable PayPal capture.

### Manual Admin Handling Required

Manual handling is required when:

- One or more passengers must be removed.
- A booked seat assignment must be removed, changed, or refunded.
- A purchased service must be removed or reduced.
- Duffel marks the requested slice as unchangeable.
- The airline returns no supported change offers.
- The order has departed, is cancelled, or otherwise has an incompatible live state.
- The booking was modified outside Vacatina and local data cannot be reconciled automatically.
- Duffel or PayPal fails after a financial side effect and automatic recovery cannot prove a safe next action.

Manual processing may use the Duffel dashboard, airline website, airline support, or another approved supplier channel. The admin must record the result, external reference, customer message, and refund outcome in Vacatina.

## Duffel API Operations

The installed `@duffel/api` SDK already exposes the required Order Change and post-booking service methods.

### Refresh and Eligibility

Use:

- `duffel.orders.get(orderId)`
- HTTP equivalent: `GET /air/orders/{id}`

Before offering an automatic itinerary change:

- Refresh the order from Duffel.
- Confirm the order is not cancelled or departed.
- Check the selected slice's `changeable` value from the live order.
- Also retain `available_actions` where returned for compatibility and operational visibility.
- Do not rely only on the stored booking snapshot because airline state may have changed.

### Search for Replacement Flights

Use:

- `duffel.orderChangeRequests.create(...)`
- HTTP equivalent: `POST /air/order_change_requests`

Required input:

- Duffel order ID.
- Existing slice IDs to remove.
- Replacement origin.
- Replacement destination.
- Replacement departure date.
- Cabin class.

The passenger list is inherited from the existing order. This endpoint changes the itinerary; it does not remove selected passengers.

### Retrieve Change Offers

Use:

- `duffel.orderChangeRequests.get(orderChangeRequestId)`
- HTTP equivalent: `GET /air/order_change_requests/{id}`
- Optionally `duffel.orderChangeOffers.get(orderChangeOfferId)`
- HTTP equivalent: `GET /air/order_change_offers/{id}`

Persist or expose:

- Offer ID.
- Expiry.
- Slices and segments being removed and added.
- Marketing and operating carriers.
- New total amount.
- Change total amount and currency.
- Airline penalty amount and currency.
- Refund destination when present.
- Raw payload for support and audit use.

The customer must see the operating carrier prominently when reviewing replacement flights.

### Create the Pending Change

Use:

- `duffel.orderChanges.create({ selected_order_change_offer })`
- HTTP equivalent: `POST /air/order_changes`

The returned pending change is the authoritative final quote. Store:

- Duffel order change ID.
- Selected offer ID.
- Final change amount and currency.
- New order total.
- Airline penalty.
- Refund destination.
- Expiry.
- Confirmation time when later confirmed.
- Raw payload.

The customer must review this final amount before payment or confirmation.

### Refresh the Pending Change

Use:

- `duffel.orderChanges.get(orderChangeId)`
- HTTP equivalent: `GET /air/order_changes/{id}`

Refresh immediately before starting payment and again before committing a zero/negative change. If the change expired or the price changed, return the customer/admin to review instead of silently continuing.

### Confirm the Pending Change

Use:

- `duffel.orderChanges.confirm(orderChangeId, payload)`
- HTTP equivalent: `POST /air/order_changes/{id}/actions/confirm`

Rules:

- Positive amount: supply Duffel payment details using an allowed payment type, normally Vacatina's Duffel balance.
- Zero amount: omit the payment object.
- Negative amount: omit the payment object and process only after admin approval.
- Never confirm twice; use stored confirmation state and idempotent local orchestration.
- After confirmation, retrieve the live order and replace the local order snapshot.

### Add Post-Booking Baggage

Use:

- `duffel.orders.getAvailableServices(orderId)`
- HTTP equivalent: `GET /air/orders/{id}/available_services`
- `duffel.orders.addServices(orderId, payload)`
- HTTP equivalent: `POST /air/orders/{id}/services`

Rules:

- Show only services returned for the current order.
- Validate passenger and segment applicability.
- Respect `maximum_quantity` where provided.
- Do not offer this flow for unsupported hold orders.
- Re-fetch available services before payment because availability and price can change.
- Refresh the order snapshot after successful addition.
- Do not represent service removal through this endpoint.

## Customer Experience

### Entry Point

Add a `Change booking` action to:

`/booking/[bookingReference]`

Suggested new route:

`/booking/[bookingReference]/change`

The page should offer clear actions instead of one ambiguous form:

- Change a flight.
- Add baggage.
- Remove a traveller.
- Request another change.

Do not use `remove a seat` as the primary label. Use `remove a traveller` when the customer means that one person will no longer fly.

### Change a Flight

1. Show the current outbound, inbound, or multi-city journeys.
2. Let the customer select one or more changeable slices.
3. Collect new date, origin, destination, and cabin criteria.
4. Create a Duffel order change request.
5. Display replacement offers with full itinerary and carrier details.
6. Create a pending order change after offer selection.
7. Display the final difference, airline penalty, new total, expiry, and important conditions.
8. Route to payment, immediate confirmation, or admin review based on the final amount.

### Add Baggage

1. Retrieve current available services.
2. Group baggage by passenger and applicable segment.
3. Let the customer choose quantities within supplier limits.
4. Show the final additional amount.
5. Collect PayPal payment.
6. Add the service through Duffel.
7. Refresh the order and show the updated baggage summary.

### Remove a Traveller

1. Show the passenger list.
2. Let the customer select the traveller who will no longer fly.
3. Collect a reason and optional notes.
4. Clearly explain that airline review and refund rules apply.
5. Create an admin change request without modifying Duffel automatically.
6. Show the request status and support information.

The system must validate infant/adult relationships. Removing an adult linked to an `infant_without_seat` must also require the admin to decide how the infant will be handled.

### Other Manual Requests

Provide structured request types for:

- Change or remove a seat assignment.
- Remove baggage or another purchased service.
- Correct traveller details.
- Other airline-supported modification.

These requests go directly to manual admin review.

## UI Screens and Component Reuse Plan

The first implementation should preserve the current Vacatina booking and admin visual language. Reuse existing primitives and extract genuinely shared booking/payment/admin pieces, but keep change-specific state and actions inside `modules/flights/changes`.

### Screen Inventory

| Screen | Route | Work required | Main responsibility |
| --- | --- | --- | --- |
| Existing customer booking detail | `/booking/[bookingReference]` | Extend | Add `Change booking`, show active change status, and enforce cancellation/change conflicts |
| Change booking home | `/booking/[bookingReference]/change` | Create | Present `Change a flight`, `Add baggage`, `Remove a traveller`, and `Other request` choices |
| Flight-change search | `/booking/[bookingReference]/change/flight` | Create | Select slices and collect replacement date/route/cabin criteria |
| Flight-change offers | `/booking/[bookingReference]/change/[changeRequestId]/offers` | Create | Show Duffel replacement offers and let the customer select one |
| Final change review | `/booking/[bookingReference]/change/[changeRequestId]/review` | Create | Show the pending change, final difference, penalty, expiry, conditions, and required next action |
| Change payment | `/booking/[bookingReference]/change/[changeRequestId]/pay` | Create | Collect a positive price difference through shared PayPal controls |
| Manual change request | `/booking/[bookingReference]/change/request` | Create | Submit passenger removal, seat/service removal, traveller-details, or another manual request |
| Change status | `/booking/[bookingReference]/change/[changeRequestId]` | Create | Show payment, admin review, supplier confirmation, refund, and completion state |
| Existing admin booking detail | `/admin/bookings/[bookingReference]` | Extend | Show linked change requests and provide a direct admin navigation entry |
| Admin change queue | `/admin/changes` | Create | List, search, filter, prioritize, and open automatic/admin/manual change cases |
| Admin change detail | `/admin/changes/[requestId]` | Create | Review supplier/payment/refund state and perform admin or reconciliation actions |
| Existing admin payment detail | `/admin/payments/[paymentAttemptId]` | Extend | Link a payment/refund attempt to its flight change request |

Use a stable `changeRequestId` in the URL after the request is created. Do not keep a consequential pending change only in browser state or query parameters.

### Existing Components to Reuse As-Is

| Existing component | Current location | Reuse in flight changes |
| --- | --- | --- |
| `Button` | `components/ui/button.tsx` | All customer/admin actions and links |
| `Badge` | `components/ui/badge.tsx` | Change, payment, refund, and handling-mode status |
| `Card` family | `components/ui/card.tsx` | Request choices, itinerary summaries, price review, and status panels |
| `Alert` family | `components/ui/alert.tsx` | Expiry, timing, supplier conflict, payment, and manual-support warnings |
| `Breadcrumb` family | `components/ui/breadcrumb.tsx` | Customer and admin route hierarchy |
| `Input`, `Textarea`, `Label`, and `Field` | `components/ui/*` | Search criteria, reasons, notes, and admin decisions |
| `Select`, `RadioGroup`, `Calendar`, and `Popover` | `components/ui/*` | Cabin, traveller, slice, request type, date, and filtering controls |
| `Dialog` | `components/ui/dialog.tsx` | Destructive or consequential confirmation prompts |
| `Table` and `Pagination` | `components/ui/*` | Admin change queue |
| `Empty` family | `components/ui/empty.tsx` | No offers, no requests, and no available services states |
| `Skeleton` and `Spinner` | `components/ui/*` | Supplier search, payment, and confirmation loading states |
| `Separator` | `components/ui/separator.tsx` | Booking, pricing, and timeline section separation |
| `MaterialIcon` | `components/ui/material-icon.tsx` | Existing admin navigation icon style |
| `Money` | `modules/currency/ui` | Supplier difference, penalties, payment, refund, and totals |
| `FxEstimateDisclosure` | `modules/currency/ui` | Any supported display involving estimated currency conversion |
| `ReconcilePaymentButton` | `modules/payments/ui/reconcile-payment-button.tsx` | Existing payment-detail reconciliation action when the underlying payment record supports a change purpose |

These primitives should be imported directly. Do not recreate local button, badge, money, table, spinner, or form-control variants inside the change module.

### Existing Components to Extend

#### `BookingDetailView`

Current location:

`modules/flights/orders/ui/booking-detail-view.tsx`

Extend it to:

- Replace or complete the current `Manage this order` control with links to change and cancellation actions.
- Accept a compact change-status summary in addition to the cancellation status.
- Show an active change card in the side rail.
- Disable or explain conflicting actions while a cancellation or consequential change is active.
- Keep the existing journey, passenger, ticket, service, fare-condition, and notification presentation.

Do not duplicate the entire booking detail page inside the change module.

#### `AdminBookingDetail`

Current location:

`modules/flights/orders/ui/admin-booking-detail.tsx`

Extend it with:

- A list of current and historical change requests.
- Status, type, payment/refund summary, and last update.
- A link to `/admin/changes/[requestId]`.
- A `Create manual change case` action only if operationally required later.

#### `AdminPaymentDetail` and `AdminPaymentsTable`

Current locations:

- `modules/payments/ui/admin-payment-detail.tsx`
- `modules/payments/ui/admin-payments-table.tsx`

Extend their view models and links so a payment with purpose `flight_change` or `post_booking_service` points to its change request. Continue showing provider order, capture, refund, event, and reconciliation details in the payment module rather than copying them into a second payment UI.

### Existing Components to Extract Before Reuse

#### Shared Admin Shell

Current component:

`modules/flights/cancellations/ui/admin-panel-shell.tsx`

It already wraps the dashboard, bookings, payments, cancellations, and settings screens, but it is owned by the cancellation module and its `active` type/navigation badge are cancellation-specific.

Before adding the Changes navigation item:

1. Move or extract it to a neutral location such as `modules/admin/ui/admin-panel-shell.tsx`.
2. Add `changes` to the active navigation type.
3. Add `/admin/changes` to the navigation.
4. Replace `queueItems?: AdminCancellationQueueItem[]` with generic navigation counts such as `{ cancellations: number; changes: number }`.
5. Keep `AdminSidebarProfile`, or move it beside the shared shell if it has no cancellation-specific behavior.
6. Update existing admin pages to import the neutral shell.

This refactor prevents the new change module from depending on cancellation UI merely to render the global admin layout.

#### Shared Pending Submit Button

Current component:

`modules/flights/cancellations/ui/pending-submit-button.tsx`

The component is generic and already used outside the cancellation feature. Move it to a neutral location such as `components/ui/pending-submit-button.tsx`, keep its API, and update existing imports. Use it for customer request submission and admin server-action forms.

#### Shared PayPal One-Time Payment Controls

Current implementation:

`modules/flights/checkout/ui/wizard/pay-step.tsx`

The existing `CheckoutPayStep` is tied to checkout-specific data and text, so it should not be imported into flight changes. Extract only the reusable PayPal v6 provider and wallet/guest-card controls into a payment-owned component, for example:

`modules/payments/ui/paypal-one-time-payment-controls.tsx`

The extracted component should accept:

- Amount and currency.
- PayPal environment/client configuration.
- Disabled/loading state.
- `onCreateOrder` callback.
- `onCaptureOrder` callback.
- Cancel and error callbacks.
- Optional customer-facing context text.

Both checkout and flight changes should compose this shared payment control with their own pricing summary and server actions. Payment creation/capture must remain purpose-specific on the server.

#### Shared Booking Summary Components

The existing `BookingDetailView` contains useful journey, passenger, ticket, and service rendering, but much of it is private to one large file. Extract only the read-only summaries needed on multiple screens, for example:

```text
modules/flights/orders/ui/booking-journey-summary.tsx
modules/flights/orders/ui/booking-passenger-summary.tsx
modules/flights/orders/ui/booking-services-summary.tsx
```

Reuse these on the customer final-review/status pages and admin change detail. Keep formatting and snapshot normalization in the orders domain rather than rebuilding airline/timeline formatting inside `changes`.

### Existing Components to Use as Design Patterns, Not Direct Imports

| Existing component | Reason not to import directly | New change equivalent |
| --- | --- | --- |
| `CancellationStatusPanel` | Typed to cancellation states, text, and routes | `ChangeStatusPanel` |
| `CancellationRequestView` | Implements full-order cancellation policy | `ManualChangeRequestForm` and change-booking screens |
| `AdminCancellationQueue` | Cancellation-specific columns and service model | `AdminChangeQueue` |
| `AdminCancellationDetail` | Cancellation-specific actions and state machine | `AdminChangeDetail` |
| Cancellation status presentation helpers | Cancellation tones do not represent offers/payment/confirmation | Change-specific status presentation helpers |
| `CheckoutWizardShell` | Assumes new-booking checkout steps | `ChangeFlowShell` or normal route layout |
| `CheckoutPayStep` | Coupled to checkout quote and traveller validation | `ChangePaymentPanel` using extracted PayPal controls |
| `DuffelAncillariesPanel` | Designed for offer-time ancillaries during checkout | `PostBookingBaggageSelector` using order available services |

Matching the established design is encouraged, but copying these components and renaming cancellation/checkout fields would couple unrelated workflows and make state bugs more likely.

### New Customer Components to Create

Suggested components inside `modules/flights/changes/ui`:

| Component | Responsibility |
| --- | --- |
| `ChangeBookingView` | Top-level action chooser and eligibility/manual-support messaging |
| `ChangeActionCard` | Reusable card for flight, baggage, traveller removal, and other request choices |
| `ChangeFlightForm` | Slice selection plus replacement date/route/cabin criteria |
| `ChangeOfferList` | Responsive list of Duffel replacement offers |
| `ChangeOfferCard` | Carrier, schedule, stops, cabin, penalty, difference, and expiry presentation |
| `PendingChangeReview` | Authoritative final Duffel pending-change review and customer confirmation |
| `ChangePriceBreakdown` | Old/new totals, airline penalty, additional payment or expected refund |
| `ChangePaymentPanel` | Change-specific PayPal composition using shared payment controls |
| `PostBookingBaggageSelector` | Passenger/segment-specific available baggage selection and quantities |
| `ManualChangeRequestForm` | Passenger removal and other unsupported request intake |
| `ChangeStatusPanel` | Compact booking-detail status/action panel |
| `ChangeStatusTimeline` | Full customer-facing progress and action history |
| `ChangeConflictAlert` | Active cancellation/change and external-state conflict explanation |

### New Admin Components to Create

Suggested components inside `modules/flights/changes/ui`:

| Component | Responsibility |
| --- | --- |
| `AdminChangeQueue` | Desktop table/mobile cards, filters, priority, and pagination |
| `AdminChangeDetail` | Complete request, booking, supplier, payment, refund, and audit workspace |
| `AdminChangeSummaryCards` | Open, urgent, refund, reconciliation, and manual-case counts |
| `AdminChangeActions` | Approve, reject, retry, reconcile, and manual-completion forms |
| `AdminChangePricingPanel` | Supplier difference, penalties, Vacatina fee, payment, and refund decisions |
| `AdminChangeSupplierPanel` | Duffel search/offer/pending-change IDs, expiry, state, and refresh actions |
| `AdminChangePaymentPanel` | Compact linked payment/refund state with navigation to payment detail |
| `AdminManualCompletionForm` | External supplier reference, outcome type, notes, and refreshed order details |
| `AdminChangeTimeline` | Full audit trail with actor and metadata presentation |

### Responsive and Accessibility Requirements

- Follow the existing admin pattern of tables on larger screens and cards on smaller screens.
- All consequential actions must use explicit labels such as `Pay and confirm change`, `Approve airline change`, and `Approve customer refund`.
- Do not rely on color alone for payment, refund, expiry, or failure states.
- Offer selection, traveller selection, and request-type selection must be keyboard accessible.
- Announce supplier search, payment processing, and confirmation progress with accessible live status text.
- Show absolute expiry date/time and a human-readable remaining-time label.
- Disable submission while a server action is pending and preserve idempotency if a page is refreshed.
- Keep operating carrier names visible in the first offer-selection view.
- Show manual-support contact details whenever the customer cannot continue automatically.

### UI Implementation Order

1. Extract the shared admin shell and pending-submit button.
2. Extract read-only booking summaries from `BookingDetailView` where the new screens need them.
3. Add the `Change booking` entry point and `ChangeStatusPanel` to the existing booking detail.
4. Build the change home and manual request/status screens first so unsupported cases have a safe path.
5. Build flight search, offer list, and pending-change review.
6. Extract shared PayPal controls and add the change payment screen.
7. Build the admin queue/detail workspace.
8. Add post-booking baggage selection after the itinerary workflow is stable.

## Automated Positive-Price Flow

This flow is used when a supported itinerary change or baggage addition costs more.

1. Verify booking access and retrieve the live Duffel order.
2. Create and store the pending Duffel operation before taking customer payment.
3. Store its final amount, currency, and expiry.
4. Create a PayPal payment attempt with a purpose such as `flight_change` or `post_booking_service`.
5. Capture the exact customer-facing amount.
6. Persist the completed capture before calling Duffel.
7. Enqueue a durable fulfillment task.
8. The worker refreshes the pending Duffel resource and validates amount, currency, expiry, and unconfirmed state.
9. Confirm the Duffel order change or add the selected service.
10. Retrieve and persist the updated order snapshot.
11. Mark the change completed and notify the customer.

### Positive-Price Safety Rules

- Browser callbacks must not be the only fulfillment mechanism.
- PayPal webhook, browser callback, cron fallback, and reconciliation must share the same idempotency key.
- Never collect an amount different from the final stored supplier quote plus explicitly disclosed Vacatina fees.
- Never call Duffel before PayPal capture is durably recorded.
- Never mark the request completed before the refreshed Duffel order is stored.
- If payment capture succeeds but Duffel fulfillment fails, move to `manual_processing` or `reconciliation_required` and alert admins.
- Do not automatically charge the customer a second time when recreating an expired Duffel change.
- If the captured amount cannot fulfill the supplier operation, an admin must decide whether to retry, refund, or collect an approved difference.

## Zero-Price Automated Flow

1. Create and refresh the pending Duffel change.
2. Show the final zero difference and change conditions.
3. Require explicit customer confirmation.
4. Confirm Duffel without a payment object.
5. Refresh and store the order.
6. Mark the change completed and notify the customer.

If the price changes away from zero before confirmation, stop and return to final review.

## Negative-Price and Refund Flow

This flow is used when the pending Duffel change indicates a negative `change_total_amount`.

1. Store the pending change and route the request to `admin_review_required`.
2. Show the admin the airline amount, airline penalty, Duffel refund destination, customer payment, Vacatina fee, and proposed customer refund.
3. Admin approves or rejects the airline change separately from approving the customer refund.
4. Immediately before approval, refresh or recreate the pending Duffel change if required.
5. If the amount or itinerary changed, require admin review again.
6. On change approval, confirm Duffel without a payment object.
7. Refresh and store the updated order.
8. Move the request to `refund_pending`.
9. Admin confirms the customer refund amount.
10. Refund the original PayPal capture using an idempotency key scoped to the change request.
11. Store the provider refund ID, status, response, and timestamps.
12. Mark the request completed only after the refund is completed or explicitly recorded as manually completed.

### Refund Rules

- Customer refund must never exceed the amount successfully captured from that customer payment.
- Duffel's refund and PayPal's refund are distinct operations.
- A Duffel refund may return to balance, voucher, card, ARC/BSP cash, or another supplier-supported destination depending on the returned resource and account configuration.
- The admin UI must not imply that a Duffel refund automatically refunded the customer's PayPal payment.
- Refund approval must be recorded separately from airline change approval.
- PayPal refund attempts must be idempotent.
- Failed provider refunds move to manual processing and remain visible to admins.
- Admins can record a manually completed refund with an external reference and note.

## Manual Passenger-Removal Flow

1. Customer selects `Remove a traveller`.
2. System validates booking access and stores the selected passenger ID and snapshot.
3. System prevents automatic Duffel modification.
4. Request enters `admin_review_required` or `manual_processing`.
5. Admin reviews fare rules, departure timing, passenger relationships, documents, and previous changes.
6. Admin completes the airline-side action using Duffel dashboard, airline portal, or airline support.
7. Admin records whether the operation was passenger cancellation, split booking, partial refund, full cancel/rebook, or rejected by the airline.
8. Admin records supplier references and the updated Duffel order or replacement order ID where applicable.
9. Admin refreshes or manually reconciles the local booking snapshot.
10. Any customer refund follows the existing approval and PayPal/manual refund safeguards.
11. Customer receives a status update and final outcome.

The system must not assume that a passenger's proportional share of the original total is refundable. Airline penalties, taxes, fare construction, and booking changes can make the actual amount different.

## Failure and Recovery Handling

### Offer or Pending Change Expired

- Mark the stored quote expired.
- Let the customer search again.
- Do not reuse an expired offer or pending change.
- If PayPal has already been captured, do not ask for payment again; route to reconciliation.

### No Duffel Change Offers

- Let the customer adjust their search criteria.
- Provide a manual-support option.
- Store supplier errors only when useful for support; do not expose raw API errors to customers.

### PayPal Payment Failed or Cancelled

- Leave the Duffel change unconfirmed.
- Let the customer retry while it remains valid.
- Create no duplicate capture.
- Expire the local request when the supplier quote expires unless a new quote is created.

### PayPal Captured, Duffel Not Confirmed

- Mark the request `reconciliation_required` or `manual_processing`.
- Alert admins immediately.
- Re-fetch the Duffel change and order before deciding the next action.
- If Duffel already confirmed, repair local state without another supplier call.
- If the pending change remains valid and amounts match, retry fulfillment idempotently.
- Otherwise, admin decides whether to create a replacement change, collect/refund a difference, or refund the captured PayPal payment.

### Duffel Confirmed, Local Snapshot Update Failed

- Treat Duffel as authoritative.
- Keep the request in reconciliation, not failed/cancelled.
- Retry `orders.get` and local snapshot persistence.
- Do not confirm Duffel again.

### Refund Failed

- Keep the airline change result intact.
- Record the PayPal failure response.
- Move the request to manual processing.
- Allow an idempotent retry or manual completion.

### External Booking Change Detected

- Refresh the Duffel order before every consequential action.
- If slices, passengers, cancellation state, or totals conflict with the stored request, stop automation.
- Show the conflict in the admin timeline and require reconciliation.

## Proposed Module Structure

Create a dedicated feature module:

```text
modules/flights/changes/
  domain/
    index.ts
    schema.ts
    types.ts
  server/
    actions.ts
    admin-service.ts
    config.ts
    duffel.ts
    repository.ts
    service.ts
  ui/
    admin-change-detail.tsx
    admin-change-queue.tsx
    change-booking-view.tsx
    change-flight-flow.tsx
    change-status-panel.tsx
    manual-change-request-form.tsx
```

Suggested routes:

```text
app/booking/[bookingReference]/change/page.tsx
app/admin/changes/page.tsx
app/admin/changes/[requestId]/page.tsx
```

The changes module may call reusable payment/refund utilities, but it should not import cancellation UI or pretend a change request is a cancellation request.

## Proposed Data Model

### `flight_change_requests`

Suggested fields:

- `id`
- `flight_order_id`
- `booking_reference`
- `duffel_order_id`
- `requested_by_user_id`
- `requested_by_guest_id`
- `request_type`
- `handling_mode`
- `status`
- `customer_reason`
- `selected_passenger_ids`
- `selected_slice_ids`
- `requested_change`
- `pricing_direction`
- `additional_payment_amount`
- `customer_refund_amount`
- `currency`
- `payment_attempt_id`
- `change_approved_by`
- `change_approved_at`
- `refund_approved_by`
- `refund_approved_at`
- `admin_rejection_reason`
- `customer_message`
- `manual_external_reference`
- `manual_completion_notes`
- `created_at`
- `updated_at`

Suggested `request_type` values:

- `itinerary_change`
- `add_baggage`
- `remove_passenger`
- `seat_change`
- `remove_service`
- `traveller_details_change`
- `other`

Suggested `handling_mode` values:

- `automatic`
- `admin_approval`
- `manual`

Suggested `pricing_direction` values:

- `unknown`
- `additional_payment`
- `no_difference`
- `customer_refund`

Suggested statuses:

- `requested`
- `searching`
- `offers_ready`
- `pending_change_ready`
- `payment_pending`
- `payment_processing`
- `payment_captured`
- `admin_review_required`
- `duffel_confirming`
- `refund_pending`
- `manual_processing`
- `reconciliation_required`
- `completed`
- `rejected`
- `expired`
- `failed`

Terminal states should be limited to `completed`, `rejected`, and `expired`. A technical failure with unresolved money or airline state must remain actionable rather than becoming terminal.

### `flight_change_searches`

Suggested fields:

- `id`
- `change_request_id`
- `duffel_order_change_request_id`
- `removed_slice_ids`
- `add_criteria`
- `raw_payload`
- `created_at`
- `updated_at`

### `flight_change_offers`

Suggested fields:

- `id`
- `change_request_id`
- `duffel_order_change_offer_id`
- `change_total_amount`
- `change_total_currency`
- `new_total_amount`
- `new_total_currency`
- `penalty_amount`
- `penalty_currency`
- `refund_to`
- `expires_at`
- `selected_at`
- `summary_snapshot`
- `raw_payload`
- `created_at`

Persisting every returned offer is optional. For a smaller MVP, persist only the selected offer plus the original order change request ID, while treating Duffel as the live source for unselected offers.

### `flight_order_changes`

Suggested fields:

- `id`
- `change_request_id`
- `duffel_order_change_id`
- `duffel_order_change_offer_id`
- `change_total_amount`
- `change_total_currency`
- `new_total_amount`
- `new_total_currency`
- `penalty_total_amount`
- `penalty_total_currency`
- `refund_to`
- `expires_at`
- `confirmed_at`
- `raw_payload`
- `created_at`
- `updated_at`

### `flight_change_refund_attempts`

Use a change-specific refund table for the first version because the existing `flight_refund_attempts` table requires a cancellation request ID.

Suggested fields:

- `id`
- `change_request_id`
- `payment_attempt_id`
- `provider`
- `provider_capture_id`
- `provider_refund_id`
- `amount`
- `currency`
- `status`
- `raw_payload`
- `created_at`
- `updated_at`

Later, cancellation and change refunds may be generalized behind a shared refund domain after both workflows are stable.

### `flight_change_events`

Suggested fields:

- `id`
- `change_request_id`
- `actor_type`
- `actor_id`
- `event_type`
- `message`
- `metadata`
- `created_at`

Use this table as the complete customer/admin/system audit timeline.

## Payment Module Changes

The current payment records are centered on checkout sessions. Flight changes need an explicit payment purpose so checkout fulfillment cannot accidentally process a change payment as a new flight order.

Recommended changes:

- Add a payment purpose/internal order type such as `flight_order`, `flight_change`, and `post_booking_service`.
- Associate a change payment attempt with `flight_change_requests.id`.
- Add a fulfillment task type for confirming a flight change.
- Add a fulfillment task type for adding post-booking services if baggage is included in the first release.
- Reuse PayPal creation, capture, webhook inbox, reconciliation, and idempotency infrastructure.
- Dispatch fulfillment through a purpose-specific adapter.
- Keep the existing new-order fulfillment behavior unchanged.

## Admin Experience

### Change Queue

Suggested route:

`/admin/changes`

Show:

- Request ID.
- Booking reference.
- Customer.
- Request type.
- Current itinerary.
- Requested change.
- Departure time and urgency.
- Handling mode.
- Status.
- Supplier price difference.
- Customer payment/refund state.
- Latest action or failure.
- Updated time.

Provide filters for status, request type, handling mode, refund state, and departure urgency.

### Change Detail

Suggested route:

`/admin/changes/[requestId]`

Include:

- Customer request and reason.
- Original booking snapshot.
- Latest live Duffel order summary.
- Selected passengers and slices.
- Requested replacement criteria.
- Duffel search, selected offer, and pending change.
- Price difference, airline penalty, and refund destination.
- PayPal payment or refund details.
- Departure and timing warnings.
- Customer-facing message editor.
- Full audit timeline.
- Manual external references and notes.

Admin actions:

- Refresh the live Duffel order.
- Refresh/recreate a change search.
- Refresh the selected pending change.
- Approve or reject a negative-price change.
- Approve the customer refund separately.
- Retry safe Duffel fulfillment.
- Retry a PayPal refund idempotently.
- Move to manual processing.
- Record an airline-side manual change.
- Record a manual refund.
- Resolve reconciliation after checking supplier/provider state.
- Edit the customer-facing status message.

Admin routes must reuse the existing active Clerk admin guard and load no booking/change data before authorization succeeds.

## Access, Concurrency, and Conflict Rules

- Signed-in and guest booking access must reuse the existing booking authorization rules.
- Prevent more than one active consequential change for the same order.
- Prevent a new change while an active full cancellation exists.
- Prevent full cancellation while a paid or confirming change is unresolved.
- Allow abandoned draft/search requests to expire without blocking the booking permanently.
- Use database constraints or transactional claims for payment capture, Duffel confirmation, and refunds.
- Re-fetch live supplier state after an admin waits on a request or after any material time gap.
- Never trust customer-submitted passenger IDs, slice IDs, service IDs, amounts, or currencies without matching them to live/stored authoritative resources.

## Notifications

Add notification events for:

- Change request received.
- Replacement offers ready.
- Additional payment required.
- Payment received.
- Change awaiting admin approval.
- Change approved.
- Change rejected.
- Manual processing started.
- Change completed.
- Refund approved.
- Refund completed.
- Change or refund requires attention.

Customer notifications should include:

- Booking reference.
- Plain-language requested change.
- Current status.
- Required customer action.
- Amount paid or expected refund where relevant.
- Admin-edited message.
- Business support details for manual cases.

Active admins should receive alerts for new manual requests, negative changes, captured-payment fulfillment failures, supplier conflicts, and refund failures.

## Logging and Audit Requirements

- Store external resource IDs and request-scoped idempotency keys.
- Store raw Duffel payloads for selected offers, pending changes, confirmations, and failures where safe.
- Store PayPal provider IDs and responses using existing payment security practices.
- Record every status transition with actor type and actor ID.
- Record old and new amounts when a quote changes.
- Do not store secrets or unnecessary payment data in raw payloads.
- Include correlation identifiers in server logs.
- Customer-facing errors must be safe and understandable; raw provider errors belong in the admin timeline/logs.

## Recommended Implementation Phases

### Phase 1: Domain and Manual Request Foundation

- Add change tables, enums, repositories, domain validation, and event timeline.
- Add the customer `Change booking` page.
- Add manual `Remove a traveller` and other-change request forms.
- Add admin queue/detail pages and status management.
- Add conflicts with active cancellations and changes.
- Add notifications for request creation and status updates.

This phase provides a safe operational fallback before external automation is enabled.

### Phase 2: Automated Itinerary Search and Zero-Price Changes

- Add Duffel order refresh and slice eligibility.
- Add order change request search.
- Add offer review and selection.
- Add pending change creation/refresh.
- Add zero-price confirmation.
- Refresh and persist the completed order.

### Phase 3: Positive-Price Changes

- Extend payment purposes and fulfillment adapters.
- Add PayPal payment UI for change differences.
- Add durable Duffel confirmation worker.
- Add payment reconciliation and manual recovery.

### Phase 4: Negative-Price Changes and Refunds

- Add separate admin change and refund approvals.
- Add change refund attempts.
- Reuse PayPal refund provider safeguards.
- Add manual refund completion and reconciliation.

### Phase 5: Post-Booking Baggage

- Add available-service retrieval.
- Add passenger/segment-specific baggage selection.
- Add payment and durable service fulfillment.
- Refresh order snapshot and display updated services.

## Testing Requirements

### Domain Tests

- Request validation by request type.
- Passenger, slice, and service selection validation.
- Status transition rules.
- Pricing-direction calculation.
- Refund caps and currency validation.
- Active request and cancellation conflict rules.
- Infant/adult relationship warnings.

### Duffel Adapter Tests

- Live order and slice eligibility mapping.
- Order change request creation.
- Empty offer handling.
- Offer and pending-change amount mapping.
- Positive, zero, and negative confirmation payloads.
- Expiry and price-change detection.
- Order snapshot refresh after confirmation.
- Available-service validation and addition.

### Payment and Refund Tests

- Change payment purpose isolation from checkout fulfillment.
- Exact amount/currency validation.
- Duplicate browser/webhook callback handling.
- Capture followed by successful Duffel confirmation.
- Capture followed by expired or failed Duffel confirmation.
- Reconciliation when Duffel confirmed but local state did not update.
- Refund cap and idempotency.
- Failed refund to manual-processing transition.

### Authorization and Admin Tests

- Signed-in owner access.
- Valid guest booking access.
- Unauthorized booking denial.
- Non-admin denial before data load.
- Active admin access.
- Audit actor attribution.

### UI Tests

- Clear distinction between flight change, baggage addition, and traveller removal.
- Operating carrier shown on offer review.
- Final price, penalty, and expiry shown before confirmation.
- Positive amount routes to PayPal.
- Zero amount routes to customer confirmation.
- Negative amount routes to admin review.
- Manual requests never call automated Duffel mutation methods.
- Recovery states provide a status and support path.

## Acceptance Criteria

The MVP is acceptable when:

- A booking owner or authorized guest can open `Change booking`.
- The UI clearly explains which operations are automatic and which require review.
- A customer can submit a passenger-removal request without the system automatically modifying Duffel.
- An active admin can review and complete/reject manual requests with an audit trail.
- A supported itinerary can be searched and replacement offers displayed accurately.
- The final Duffel pending-change price is shown before any commitment.
- A zero-price change can be confirmed exactly once and refreshes the local booking.
- A positive-price change cannot be confirmed before PayPal capture is durably recorded.
- Captured-payment failures remain visible and recoverable.
- A negative-price change cannot be confirmed without admin approval.
- Customer refunds require separate approval and cannot exceed captured payment.
- Full cancellation and change workflows cannot mutate the same booking concurrently.
- Automated success refreshes the local order snapshot and notifies the customer.
- Unsupported operations always have a manual admin path.

## Out of Scope for the Initial Release

- Automatically removing a passenger through an undocumented airline-specific workflow.
- Automatically removing or refunding a booked seat assignment.
- Automatically removing previously purchased baggage or services.
- Purchasing an extra comfort seat for one passenger.
- Automatically correcting passenger names or identity documents.
- Automatically splitting an airline booking record.
- Exchanges involving multiple currencies without an explicit supported conversion and accounting design.
- Fully automatic customer refunds without admin approval.

## Reference Documentation

- Duffel guide: <https://duffel.com/docs/guides/changing-an-order>
- Duffel Order Change Requests API: <https://duffel.com/docs/api/order-change-requests/get-order-change-request-by-id>
- Duffel Order Changes API: <https://duffel.com/docs/api/order-changes>
- Duffel Seat Maps API: <https://duffel.com/docs/api/v2/seat-maps/get-seat-maps>
- Duffel post-booking baggage guide: <https://duffel.com/docs/guides/adding-post-booking-bags>
- Existing Vacatina cancellation plan: `docs/manage/flight-cancellation-feature-plan.md`
- Existing cancellation implementation tasks: `docs/manage/flight-cancellation-implementation-tasks.md`

## Final Product Rule

Use this rule when deciding how a request should be handled:

- Customer pays more and Duffel supports the operation: automate after payment.
- No money changes hands and Duffel supports the operation: automate after final customer confirmation.
- Customer may receive money back: require admin approval and separate refund approval.
- Passenger, booked seat, or purchased service is being removed: use manual admin handling.
- Supplier or payment state is uncertain: stop automation and reconcile before taking another financial or airline action.
