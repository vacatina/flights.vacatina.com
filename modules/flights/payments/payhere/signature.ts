import "server-only"

import { createHash, timingSafeEqual } from "node:crypto"

import type { PayHereNotifyPayload } from "@/modules/flights/payments/payhere/types"

export function createPayHereRequestHash(input: {
  merchantId: string
  merchantSecret: string
  orderId: string
  amount: string
  currency: string
}) {
  const merchantSecretHash = toUpperMd5(input.merchantSecret)
  const payload = `${input.merchantId}${input.orderId}${input.amount}${input.currency}${merchantSecretHash}`
  return toUpperMd5(payload)
}

export function createPayHereNotifyExpectedSignature(input: {
  merchantSecret: string
  payload: Pick<
    PayHereNotifyPayload,
    | "merchant_id"
    | "order_id"
    | "payhere_amount"
    | "payhere_currency"
    | "status_code"
  >
}) {
  const merchantSecretHash = toUpperMd5(input.merchantSecret)
  const payload = `${input.payload.merchant_id}${input.payload.order_id}${input.payload.payhere_amount}${input.payload.payhere_currency}${input.payload.status_code}${merchantSecretHash}`
  return toUpperMd5(payload)
}

export function verifyPayHereNotifySignature(input: {
  merchantSecret: string
  payload: Pick<
    PayHereNotifyPayload,
    | "merchant_id"
    | "order_id"
    | "payhere_amount"
    | "payhere_currency"
    | "status_code"
    | "md5sig"
  >
}) {
  const expected = createPayHereNotifyExpectedSignature({
    merchantSecret: input.merchantSecret,
    payload: input.payload,
  })
  const received = input.payload.md5sig.trim().toUpperCase()

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  } catch {
    return false
  }
}

export function toPayHereAmount(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "0.00"
  }

  return value.toFixed(2)
}

function toUpperMd5(value: string) {
  return createHash("md5").update(value).digest("hex").toUpperCase()
}

