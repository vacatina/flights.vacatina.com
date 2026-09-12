import { NextRequest } from "next/server"

import type { PayPalWebhookEvent } from "@/modules/payments/server/providers/paypal"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"
import { incrementCheckoutMetric } from "@/modules/flights/checkout/server/metrics"
import { verifyAndStorePayPalWebhook } from "@/modules/payments/server/webhooks/paypal"

export async function POST(request: NextRequest) {
  let event: PayPalWebhookEvent

  try {
    event = (await request.json()) as PayPalWebhookEvent
  } catch (error) {
    incrementCheckoutMetric("paypal_webhook_invalid_sig_total", {
      reason: "invalid_json",
    })
    logFlightFlowError("checkout.paypal", "webhook_invalid_json", error)
    return new Response("Invalid PayPal webhook payload", { status: 400 })
  }

  try {
    const result = await verifyAndStorePayPalWebhook({
      headers: request.headers,
      event,
    })

    if (!result.ok) {
      incrementCheckoutMetric("paypal_webhook_invalid_sig_total", {
        reason: result.reason,
      })
      return new Response("Invalid PayPal webhook", { status: 400 })
    }

    logFlightFlow("checkout.paypal", "webhook_stored", {
      eventId: event.id ?? null,
      eventType: event.event_type ?? null,
    })

    return new Response("OK", { status: 200 })
  } catch (error) {
    incrementCheckoutMetric("paypal_webhook_invalid_sig_total", {
      reason: error instanceof Error ? error.message : "unknown",
    })
    logFlightFlowError("checkout.paypal", "webhook_failed", error)
    return new Response("PayPal webhook handling failed", { status: 400 })
  }
}
