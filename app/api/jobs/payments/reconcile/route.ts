import { NextRequest } from "next/server"

import { isPaymentJobRequestAuthorized } from "@/modules/payments/server/job-auth"
import { reconcilePaymentAttempts } from "@/modules/payments/server/reconciliation-service"

export async function POST(request: NextRequest) {
  if (!isPaymentJobRequestAuthorized(request.headers)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await reconcilePaymentAttempts()
  return Response.json(result)
}

export async function GET(request: NextRequest) {
  return POST(request)
}
