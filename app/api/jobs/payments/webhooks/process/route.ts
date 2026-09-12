import { NextRequest } from "next/server"

import { processPayPalWebhookEvent } from "@/modules/flights/checkout/server/service-core"
import { isPaymentJobRequestAuthorized } from "@/modules/payments/server/job-auth"
import { processPayPalWebhookInbox } from "@/modules/payments/server/webhooks/paypal"

export async function POST(request: NextRequest) {
  if (!isPaymentJobRequestAuthorized(request.headers)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await processPayPalWebhookInbox({
    deps: {
      processEvent: processPayPalWebhookEvent,
    },
  })
  return Response.json(result)
}

export async function GET(request: NextRequest) {
  return POST(request)
}
