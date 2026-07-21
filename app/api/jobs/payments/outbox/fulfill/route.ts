import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"
import { z } from "zod"

import "@/modules/flights/payments-adapter/register"
import { isPaymentJobRequestAuthorized } from "@/modules/payments/server/job-auth"
import { processPaymentOutboxByPaymentAttemptId } from "@/modules/payments/server/workers/outbox-worker"

export const runtime = "nodejs"

const payloadSchema = z.object({
  paymentAttemptId: z.string().trim().min(1),
})

async function handler(request: Request) {
  if (!isFulfillmentRequestAuthorized(request.headers)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = payloadSchema.safeParse(await request.json())

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid fulfillment payload",
      },
      { status: 400 }
    )
  }

  const result = await processPaymentOutboxByPaymentAttemptId({
    paymentAttemptId: parsed.data.paymentAttemptId,
  })

  return Response.json(result)
}

function hasQStashSigningKeys() {
  return Boolean(
    process.env.QSTASH_CURRENT_SIGNING_KEY?.trim() &&
      process.env.QSTASH_NEXT_SIGNING_KEY?.trim()
  )
}

function isFulfillmentRequestAuthorized(headers: Headers) {
  if (!hasQStashSigningKeys()) {
    return isPaymentJobRequestAuthorized(headers)
  }

  const jobSecret = process.env.PAYMENTS_JOB_SECRET?.trim()

  if (!jobSecret) {
    return true
  }

  return headers.get("x-job-secret")?.trim() === jobSecret
}

export const POST = hasQStashSigningKeys()
  ? verifySignatureAppRouter(handler)
  : handler
