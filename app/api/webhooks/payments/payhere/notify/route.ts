import { NextRequest } from "next/server"

import { payHereNotifySchema } from "@/modules/flights/payments/payhere"
import { processPayHereNotification } from "@/modules/flights/checkout/server/service"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const raw = Object.fromEntries(
      Array.from(form.entries()).map(([key, value]) => [key, String(value ?? "")])
    )
    const parsed = payHereNotifySchema.safeParse(raw)

    if (!parsed.success) {
      logFlightFlow("payhere.notify", "validation_failed", {
        issueCount: parsed.error.issues.length,
      })
      return new Response("Invalid notify payload", { status: 400 })
    }

    await processPayHereNotification({
      payload: parsed.data,
    })

    return new Response("OK", { status: 200 })
  } catch (error) {
    logFlightFlowError("payhere.notify", "failed", error)
    return new Response("Notify handling failed", { status: 400 })
  }
}

