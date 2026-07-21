import "server-only"

import { registerPaymentAdapter } from "@/modules/payments/server/adapters"
import { flightCheckoutPaymentAdapter } from "@/modules/flights/payments-adapter"

registerPaymentAdapter(flightCheckoutPaymentAdapter)
