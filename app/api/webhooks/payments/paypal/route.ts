import { NextRequest } from "next/server"

import {
  verifyPayPalWebhookSignature,
  type PayPalWebhookEvent,
} from "@/lib/paypal"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"
import { incrementCheckoutMetric } from "@/modules/flights/checkout/server/metrics"
import { processPayPalWebhookEvent } from "@/modules/flights/checkout/server/service"

export const runtime = "nodejs"

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
    const verified = await verifyPayPalWebhookSignature({
      headers: request.headers,
      event,
    })

    if (!verified) {
      incrementCheckoutMetric("paypal_webhook_invalid_sig_total", {
        reason: "verification_failed",
      })
      return new Response("Invalid PayPal webhook signature", { status: 400 })
    }

    await processPayPalWebhookEvent({ event })

    logFlightFlow("checkout.paypal", "webhook_processed", {
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
