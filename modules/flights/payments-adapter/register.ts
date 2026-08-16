import "server-only"

import { registerPaymentAdapter } from "@/modules/payments/server/adapters"
import {
  flightChangePaymentAdapter,
  flightCheckoutPaymentAdapter,
  flightPostBookingServicePaymentAdapter,
} from "@/modules/flights/payments-adapter"

registerPaymentAdapter(flightCheckoutPaymentAdapter)
registerPaymentAdapter(flightChangePaymentAdapter)
registerPaymentAdapter(flightPostBookingServicePaymentAdapter)
