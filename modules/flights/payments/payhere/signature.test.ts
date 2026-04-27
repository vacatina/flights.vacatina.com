import { expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  createPayHereNotifyExpectedSignature,
  createPayHereRequestHash,
  toPayHereAmount,
  verifyPayHereNotifySignature,
} from "@/modules/flights/payments/payhere/signature"

test("createPayHereRequestHash matches PayHere signing format", () => {
  const hash = createPayHereRequestHash({
    merchantId: "merchant",
    merchantSecret: "secret",
    orderId: "order123",
    amount: "100.50",
    currency: "LKR",
  })

  expect(hash).toBe("28DB9F9D90AF722B7D60C515438BADF1")
})

test("verifyPayHereNotifySignature validates md5sig", () => {
  const payload = {
    merchant_id: "merchant",
    order_id: "order123",
    payhere_amount: "100.50",
    payhere_currency: "LKR",
    status_code: "2",
    md5sig: "00B023BE4CCCEAA5E98B0A2878865D11",
  }

  expect(
    verifyPayHereNotifySignature({
      merchantSecret: "secret",
      payload,
    })
  ).toBe(true)

  expect(
    verifyPayHereNotifySignature({
      merchantSecret: "secret",
      payload: {
        ...payload,
        md5sig: "INVALID",
      },
    })
  ).toBe(false)
})

test("createPayHereNotifyExpectedSignature is deterministic", () => {
  const signature = createPayHereNotifyExpectedSignature({
    merchantSecret: "secret",
    payload: {
      merchant_id: "merchant",
      order_id: "order123",
      payhere_amount: "100.50",
      payhere_currency: "LKR",
      status_code: "2",
    },
  })

  expect(signature).toBe("00B023BE4CCCEAA5E98B0A2878865D11")
})

test("toPayHereAmount clamps invalid values and formats decimals", () => {
  expect(toPayHereAmount(100)).toBe("100.00")
  expect(toPayHereAmount(100.789)).toBe("100.79")
  expect(toPayHereAmount(-5)).toBe("0.00")
  expect(toPayHereAmount(Number.NaN)).toBe("0.00")
})
