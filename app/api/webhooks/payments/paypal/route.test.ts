import { beforeEach, expect, test, vi } from "vitest"

const mockFns = vi.hoisted(() => ({
  verifyAndStorePayPalWebhook: vi.fn(),
  incrementCheckoutMetric: vi.fn(),
}))

vi.mock("@/modules/payments/server/webhooks/paypal", () => ({
  verifyAndStorePayPalWebhook: mockFns.verifyAndStorePayPalWebhook,
}))

vi.mock("@/modules/flights/checkout/server/metrics", () => ({
  incrementCheckoutMetric: mockFns.incrementCheckoutMetric,
}))

import { POST } from "@/app/api/webhooks/payments/paypal/route"

beforeEach(() => {
  vi.clearAllMocks()
})

test("POST returns 200 for a valid PayPal webhook", async () => {
  const event = {
    id: "WH-1",
    event_type: "PAYMENT.CAPTURE.COMPLETED",
  }
  mockFns.verifyAndStorePayPalWebhook.mockResolvedValue({
    ok: true,
    inbox: {
      id: "pwi_1",
    },
  })

  const response = await POST(
    new Request("https://example.com/api/webhooks/payments/paypal", {
      method: "POST",
      body: JSON.stringify(event),
      headers: {
        "paypal-transmission-id": "transmission_1",
        "paypal-transmission-sig": "sig_test_123",
      },
    }) as never
  )

  expect(response.status).toBe(200)
  expect(mockFns.verifyAndStorePayPalWebhook).toHaveBeenCalledWith(
    expect.objectContaining({
      event,
    })
  )
})

test("POST returns 400 for an invalid PayPal signature", async () => {
  mockFns.verifyAndStorePayPalWebhook.mockResolvedValue({
    ok: false,
    reason: "verification_failed",
  })

  const response = await POST(
    new Request("https://example.com/api/webhooks/payments/paypal", {
      method: "POST",
      body: JSON.stringify({ id: "WH-1" }),
      headers: {
        "paypal-transmission-id": "transmission_1",
        "paypal-transmission-sig": "sig_test_123",
      },
    }) as never
  )

  expect(response.status).toBe(400)
  expect(mockFns.incrementCheckoutMetric).toHaveBeenCalledWith(
    "paypal_webhook_invalid_sig_total",
    expect.objectContaining({
      reason: "verification_failed",
    })
  )
})
