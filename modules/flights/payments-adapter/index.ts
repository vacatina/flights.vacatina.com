import "server-only"

import { fulfillAuthorizedCheckoutSession } from "@/modules/flights/checkout/server/service-core"
import type { PayableResourceAdapter } from "@/modules/payments/server/adapters"

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
