# Flight Cancellation Feature Plan

## Goal

Add flight cancellation support for Vacatina bookings with admin approval for every cancellation. The first implementation should support customer-submitted cancellation requests, admin review, Duffel cancellation handling when available, manual handling when required, and refund decision tracking.

## Confirmed Product Decisions

- Both signed-in users and guest customers should be able to request cancellation.
- Every cancellation requires admin approval before the actual cancellation is confirmed.
- Customers should be allowed to submit a manual cancellation request even when Duffel API cancellation is unavailable.
- Cancellation should be full-booking only for this feature.
- Admins should be able to decide the Vacatina cancellation/service fee.
- The service fee should support either a fixed value or a percentage from configurable settings.
- The default cancellation service fee should be no fee.
- Customers should see the estimated cancellation/service fee before submitting the request.
- If Duffel API cancellation is possible, the admin screen should provide a cancellation action.
- If Duffel API cancellation is not possible, the admin should handle the cancellation manually and notify the customer.
- A sample admin area should be created first for cancellation operations.
- Cancellation approval and refund approval should be two separate admin actions.
- The cancellation cutoff window should be decided by the admin instead of a fixed global value.
- Admins should be able to override cancellation cutoff restrictions.
- The sample admin area should use Clerk role-based authentication with a single `admin` role.
- Customers should receive email updates for every cancellation status change.
- Admin notifications should appear in the dashboard and be emailed to all admin users.
- Unpaid hold-order cancellation should be a simpler separate flow from paid booking cancellation.
- Customer payment refunds must be capped at the original captured customer payment amount.
- Already-departed bookings should still allow customer cancellation requests, but they should be treated as manual support cases.
- Customers should see an expected review time of within 24 hours.
- Rejected cancellation requests can be submitted again.
- Rejected cancellation request resubmission should have a default 10-minute cooldown.
- Admins should be able to edit the customer-facing message before status emails are sent.
- Cancellation alert emails should only be sent to active, non-suspended admin users.
- Manual support cases should show the support channels and business details configured by admins in the admin panel.
- Admin-edited customer messages do not need reusable templates.
- Service fees do not need to be shown as a separate line item in the customer refund breakdown.
- Service fees should be tracked internally for accounting/reporting, even though they do not need to be shown as a separate customer-facing line item.
- Rejected request resubmission cooldown should be configured through `FLIGHT_CANCELLATION_REJECTION_COOLDOWN_MINUTES`.
- Clerk admin access should use `publicMetadata.role = "admin"` and `publicMetadata.status = "active"`.
- Admin-configured business/support details should be stored in a `business_settings` table.
- Cancellation emails should use the same business/support details as the website footer/contact area.
- Implementation order should be database first, then UI and backend together.
- The first implementation should seed a default `business_settings` record.
- `business_settings` should be managed through an admin settings tab or similar admin settings surface.

## Duffel Constraints

Duffel cancellation support depends on the order. API cancellation is only expected to be available when the Duffel order has `cancel` in `available_actions`.

For supported orders, Duffel's full-order cancellation flow is:

1. Create an unconfirmed order cancellation quote.
2. Review refund amount, refund destination, expiry, and airline credit details.
3. Confirm the latest cancellation quote.

If `cancel` is not available in `available_actions`, the order should move to manual processing. The admin may need to request or handle the cancellation through the Duffel dashboard or another airline/support workflow.

## Customer Screens

### Booking Detail Updates

Existing booking detail should add a real cancellation entry point under `Manage this order`.

Required UI changes:

- Show `Cancel booking` action for eligible confirmed bookings.
- Show cancellation status when a request already exists.
- Show whether the request is awaiting admin review, manually processing, cancelled, refunded, rejected, or failed.
- Prevent duplicate active cancellation requests.
- Keep fare/refund conditions visible near the cancellation action.

### Cancellation Request Screen

Suggested route:

`app/booking/[bookingReference]/cancel/page.tsx`

Required content:

- Booking reference.
- Flight summary.
- Passenger list.
- Fare/refund conditions.
- Customer reason textarea.
- Estimated cancellation/service fee.
- Estimated customer refund, when available.
- Warning that cancellation is subject to admin approval and airline rules.
- Submit request button.

### Cancellation Submitted State

After submit, show:

- Request status.
- Expected review message: within 24 hours.
- Whether Duffel API cancellation appears available.
- Whether manual processing may be required.
- Customer support/contact message if needed.
- Admin-configured support channels and business details for manual cases.

## Admin Screens

### Cancellation Queue

Suggested route:

`app/admin/cancellations/page.tsx`

The sample admin queue should show:

- Booking reference.
- Customer email.
- Airline.
- Route.
- Departure date.
- Request status.
- Duffel API availability.
- Refund quote amount, if available.
- Service fee, if decided.
- Assigned/admin action state.

### Cancellation Detail

Suggested route:

`app/admin/cancellations/[requestId]/page.tsx`

Required sections:

- Booking summary.
- Customer request details.
- Passenger and segment details.
- Duffel order details.
- Fare/refund conditions.
- Duffel cancellation quote details.
- Payment details.
- Refund calculation.
- Admin notes/audit trail.

Admin actions:

- Create or refresh Duffel cancellation quote.
- Mark Duffel API cancellation unavailable.
- Approve cancellation.
- Confirm Duffel cancellation when API-supported.
- Mark manual cancellation completed.
- Decide service fee.
- Decide whether cancellation is allowed based on departure timing.
- Override cutoff/timing restrictions.
- Calculate customer refund.
- Approve refund separately from cancellation approval.
- Trigger provider refund if supported.
- Mark refund handled manually.
- Reject cancellation request.
- Edit customer-facing status message.
- Notify customer.

## Admin Access Control

The sample admin area should use Clerk role-based authentication.

MVP behavior:

- Only signed-in users with `publicMetadata.role = "admin"` and `publicMetadata.status = "active"` can access admin cancellation routes.
- Non-admin users should be denied before any cancellation data is loaded.
- The sample implementation can use a single `admin` role.
- More granular roles, such as `support` or `finance`, can be added later if refund workflows need separation.

Admin routes should be protected at the server level, not only hidden in the UI.

## Backend Work

### Cancellation Module

Create a new flight cancellation module rather than mixing cancellation state directly into the base flight order.

Suggested structure:

`modules/flights/cancellations/domain`

`modules/flights/cancellations/server`

`modules/flights/cancellations/ui`

Responsibilities:

- Validate customer cancellation requests.
- Enforce booking access for signed-in and guest customers.
- Create cancellation request records.
- Fetch live Duffel order state.
- Determine whether Duffel API cancellation is available.
- Create and store cancellation quotes.
- Confirm Duffel cancellations only after admin approval.
- Track manual cancellation status.
- Track refund status.
- Emit notifications.

### Data Model

Suggested tables:

#### `flight_cancellation_requests`

- `id`
- `flight_order_id`
- `booking_reference`
- `duffel_order_id`
- `requested_by_user_id`
- `requested_by_guest_id`
- `customer_reason`
- `status`
- `duffel_api_available`
- `admin_fee_type`
- `admin_fee_value`
- `admin_fee_amount`
- `customer_refund_amount`
- `customer_refund_currency`
- `customer_message`
- `customer_message_updated_by`
- `customer_message_updated_at`
- `cutoff_override_by`
- `cutoff_override_at`
- `cutoff_override_reason`
- `created_at`
- `updated_at`

Suggested `status` values:

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

Suggested approval fields:

- `cancellation_approved_by`
- `cancellation_approved_at`
- `refund_approved_by`
- `refund_approved_at`
- `admin_rejection_reason`

#### `flight_cancellation_quotes`

- `id`
- `cancellation_request_id`
- `duffel_order_cancellation_id`
- `refund_amount`
- `refund_currency`
- `refund_to`
- `expires_at`
- `confirmed_at`
- `raw_payload`
- `created_at`

#### `flight_refund_attempts`

- `id`
- `cancellation_request_id`
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

#### `flight_cancellation_events`

- `id`
- `cancellation_request_id`
- `actor_type`
- `actor_id`
- `event_type`
- `message`
- `metadata`
- `created_at`

This event table should be used as the admin audit trail.

#### `business_settings`

- `id`
- `business_name`
- `support_email`
- `support_phone`
- `support_whatsapp`
- `address`
- `timezone`
- `updated_by`
- `created_at`
- `updated_at`

This table should hold the admin-configured business and support details used by manual support screens, cancellation emails, admin notification context, and the website footer/contact area where applicable.

The first implementation should seed a default record so the application has usable support/business details before the admin edits them.

### Duffel Integration

Required operations:

- Get live Duffel order by id.
- Check `available_actions`.
- Create full-order cancellation quote.
- Confirm cancellation quote.
- Store raw Duffel response for audit/debugging.

Open investigation:

- Confirm how Duffel represents cancelled orders after confirmation and which fields should be copied into the stored order snapshot.

### Payment/Refund Integration

The current project uses PayPal for payments. If provider refund is supported, add a PayPal refund operation against the captured payment.

Required behavior:

- Admin decides customer refund amount.
- Customer payment refund must never exceed the original captured customer payment amount.
- System calculates customer refund using:
  - Duffel/airline refund amount.
  - Admin service fee.
  - Original customer paid amount.
- Admin confirms before the refund is sent.
- Refund action must be idempotent.
- Refund failures should move request to `failed` or `manual_processing`.
- Admin should be able to mark refund as handled manually.

Important distinction:

- Duffel/airline cancellation refund and customer payment refund are separate operational steps.
- The admin screen must make this clear.

### Service Fee Configuration

Support configurable defaults for cancellation fees:

- Fixed fee.
- Percentage fee.
- Optional minimum or maximum fee later.
- No-fee default for MVP.

Possible storage options:

- Environment variables for MVP.
- Database settings table for admin-editable configuration later.

Recommended MVP:

- Store default fee type/value in configuration with no fee by default.
- Allow admin to override per cancellation request before approving.
- Show the estimated fee and refund to the customer before request submission when enough information is available.
- Track service fees internally for accounting/reporting.

### Cancellation Timing Review

Cancellation timing should be reviewed by the admin instead of relying only on a global automatic cutoff.

Recommended behavior:

- Show time until departure on the customer and admin cancellation screens.
- Let customers submit cancellation requests even when the trip is close to departure, unless the order is already departed/cancelled.
- Let the admin decide whether the cancellation is allowed.
- Let admins record a cutoff/timing override reason.
- If the flight has already departed, allow the customer to submit the request but route it to manual support review.

### Unpaid Hold Cancellation

Unpaid hold-order cancellation should be simpler and separated from paid booking cancellation.

Recommended behavior:

- Use a separate action such as `Cancel hold`.
- Do not require refund approval because no customer payment was captured.
- Admin approval may not be required unless the hold cancellation has airline/Duffel side effects.
- Mark the hold/checkout session as cancelled or expired locally.
- If Duffel requires a separate hold release/cancel API call, handle that in the hold flow instead of the paid cancellation module.

## Notification Work

Add notification events for:

- Cancellation request received.
- Cancellation under manual review.
- Cancellation quote ready.
- Cancellation approved.
- Cancellation rejected.
- Cancellation completed.
- Refund completed.
- Refund/manual processing issue.

Customer notifications should be sent by email for every cancellation status change.

Admin notifications should be shown in the admin dashboard and emailed to all admin users.

Admins should be able to edit the customer-facing message before sending status emails.

Only active, non-suspended admin users should receive cancellation alert emails. For the MVP, active admin users are Clerk users with `publicMetadata.role = "admin"` and `publicMetadata.status = "active"`.

## MVP Scope Recommendation

Build this in phases.

Implementation order:

1. Database/schema foundation.
2. Customer UI, admin UI, and backend services together.
3. Duffel quote/confirm integration.
4. Payment/refund integration.
5. Notifications and operational polish.

### Phase 1

- Customer can submit full-order cancellation request.
- Guest and signed-in access supported.
- Admin cancellation queue and detail page.
- Clerk `admin` role protection for admin screens.
- Duffel full-order quote creation when available.
- Admin can mark manual processing when Duffel API cancellation is unavailable.
- Admin can decide service fee and final refund amount, with no fee as the default.
- Customer can see estimated service fee before submitting when available.
- Customer sees expected review time of within 24 hours.
- Rejected request resubmission has a default 10-minute cooldown configured through environment/config.
- Rejected request resubmission cooldown uses `FLIGHT_CANCELLATION_REJECTION_COOLDOWN_MINUTES`.
- Cancellation approval and refund approval are separate admin actions.
- Admin can decide whether cancellation timing is acceptable.
- Admin can override timing restrictions with a reason.
- Already-departed bookings are accepted as manual support cases.
- Refund amount is capped at the original captured payment amount.
- Cancellation service fees are tracked internally for accounting/reporting.
- Admin can edit customer-facing status email copy.
- Manual cases show admin-configured support channels and business details.
- Admin can mark refund as manually completed.
- Separate simple unpaid hold cancellation flow.
- `business_settings` table for admin-configured support and business details.
- Seeded default `business_settings` record.
- Admin settings tab or similar surface for editing `business_settings`.

### Phase 2

- Admin-triggered Duffel cancellation confirmation.
- PayPal refund integration.
- Customer cancellation status timeline.
- Email notifications.

### Phase 3

- More complete admin permissions.
- Admin-editable cancellation fee settings.
- Automated low-risk cancellation/refund rules.

## Open Questions

- No open product questions at this stage.
