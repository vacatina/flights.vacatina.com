import { NextRequest } from "next/server"

import { getStripeClient, getStripeConfig } from "@/lib/stripe"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"
import { incrementCheckoutMetric } from "@/modules/flights/checkout/server/metrics"
import {
  processStripeWebhookEvent,
} from "@/modules/flights/checkout/server/service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    incrementCheckoutMetric("stripe_webhook_invalid_sig_total", {
      reason: "missing_signature",
    })
    return new Response("Missing Stripe signature", { status: 400 })
  }

  const payload = await request.text()

  try {
    const event = getStripeClient().webhooks.constructEvent(
      payload,
      signature,
      getStripeConfig().webhookSecret
    )

    await processStripeWebhookEvent({ event })

    logFlightFlow("checkout.stripe", "webhook_processed", {
      eventId: event.id,
      eventType: event.type,
    })

    return new Response("OK", { status: 200 })
  } catch (error) {
    incrementCheckoutMetric("stripe_webhook_invalid_sig_total", {
      reason: error instanceof Error ? error.message : "unknown",
    })
    logFlightFlowError("checkout.stripe", "webhook_failed", error)
    return new Response("Stripe webhook handling failed", { status: 400 })
  }
}
