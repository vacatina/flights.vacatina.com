import "server-only"

import { fulfillAuthorizedCheckoutSession } from "@/modules/flights/checkout/server/service-core"
import type { PayableResourceAdapter } from "@/modules/payments/server/adapters"
import { fulfillPaidFlightChange, fulfillPaidPostBookingService } from "@/modules/flights/changes/server/service"

export const flightCheckoutPaymentAdapter: PayableResourceAdapter = {
  resourceType: "flight_checkout",
  async fulfill(input) {
    const order = await fulfillAuthorizedCheckoutSession({
      checkoutSessionId: input.internalOrderId,
      paymentProvider: input.provider,
      providerPaymentId: input.providerPaymentId,
    })

    return {
      status: "fulfilled",
      externalOrderId: order.duffelOrderId,
    }
  },
}

/**
 * A change payment is deliberately a separate payable resource.  In particular,
 * it must never be routed through the checkout adapter (which creates an order).
 */
export const flightChangePaymentAdapter: PayableResourceAdapter = {
  resourceType: "flight_change",
  async fulfill(input) {
    return fulfillPaidFlightChange({
      changeRequestId: input.internalOrderId,
      paymentAttemptId: input.paymentAttemptId,
      provider: input.provider,
      providerPaymentId: input.providerPaymentId,
    })
  },
}

/** Reserved independently so post-booking ancillaries cannot create or confirm an itinerary change. */
export const flightPostBookingServicePaymentAdapter: PayableResourceAdapter = {
  resourceType: "flight_post_booking_service",
  async fulfill(input) {
    return fulfillPaidPostBookingService({
      changeRequestId: input.internalOrderId,
      paymentAttemptId: input.paymentAttemptId,
      provider: input.provider,
      providerPaymentId: input.providerPaymentId,
    })
  },
}
