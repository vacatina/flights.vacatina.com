import { NextRequest } from "next/server"

import "@/modules/flights/payments-adapter/register"
import { isPaymentJobRequestAuthorized } from "@/modules/payments/server/job-auth"
import { processPaymentOutbox } from "@/modules/payments/server/workers/outbox-worker"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  if (!isPaymentJobRequestAuthorized(request.headers)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await processPaymentOutbox()
  return Response.json(result)
}

export async function GET(request: NextRequest) {
  return POST(request)
}
