import "server-only"

import { Client } from "@upstash/qstash"

import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"

interface PublishPaymentFulfillmentTaskInput {
  paymentAttemptId: string
  checkoutSessionId: string
}

let qstashClient: Client | null = null

export async function publishPaymentFulfillmentTask(
  input: PublishPaymentFulfillmentTaskInput
) {
  const token = process.env.QSTASH_TOKEN?.trim()

  if (!token) {
    logFlightFlow("payments.qstash", "publish_skipped_missing_token", {
      paymentAttemptId: input.paymentAttemptId,
      checkoutSessionId: input.checkoutSessionId,
    })
    return { published: false as const, reason: "missing_token" as const }
  }

  const destination = getPaymentFulfillmentUrl()

  if (!destination) {
    logFlightFlow("payments.qstash", "publish_skipped_missing_url", {
      paymentAttemptId: input.paymentAttemptId,
      checkoutSessionId: input.checkoutSessionId,
    })
    return { published: false as const, reason: "missing_destination" as const }
  }

  try {
    const client = getQStashClient(token)
    const result = await client.publishJSON({
      url: destination,
      body: {
        paymentAttemptId: input.paymentAttemptId,
      },
      deduplicationId: `fulfill_flight_order:${input.paymentAttemptId}`,
      retries: 5,
      headers: toForwardedHeaders(),
    })

    logFlightFlow("payments.qstash", "fulfillment_published", {
      paymentAttemptId: input.paymentAttemptId,
      checkoutSessionId: input.checkoutSessionId,
      messageId: result.messageId,
      deduplicated: result.deduplicated ?? false,
    })

    return {
      published: true as const,
      messageId: result.messageId,
      deduplicated: result.deduplicated ?? false,
    }
  } catch (error) {
    logFlightFlowError("payments.qstash", "fulfillment_publish_failed", error, {
      paymentAttemptId: input.paymentAttemptId,
      checkoutSessionId: input.checkoutSessionId,
    })
    return { published: false as const, reason: "publish_failed" as const }
  }
}

function getQStashClient(token: string) {
  if (!qstashClient) {
    qstashClient = new Client({ token })
  }

  return qstashClient
}

function getPaymentFulfillmentUrl() {
  const configured = process.env.PAYMENTS_PUBLIC_BASE_URL?.trim()

  if (configured) {
    return `${configured.replace(/\/+$/, "")}/api/jobs/payments/outbox/fulfill`
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()

  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, "")}/api/jobs/payments/outbox/fulfill`
  }

  return null
}

function toForwardedHeaders() {
  const headers: Record<string, string> = {}
  const jobSecret = process.env.PAYMENTS_JOB_SECRET?.trim()

  if (jobSecret) {
    headers["x-job-secret"] = jobSecret
  }

  return headers
}
