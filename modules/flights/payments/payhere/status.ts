import type { PayHereMappedStatus } from "@/modules/flights/payments/payhere/types"

export function mapPayHereStatusCode(statusCode: string): PayHereMappedStatus {
  const normalized = statusCode.trim()

  if (normalized === "2") {
    return "success"
  }

  if (normalized === "0") {
    return "pending"
  }

  if (normalized === "-1" || normalized === "-2") {
    return "cancelled"
  }

  return "failed"
}

