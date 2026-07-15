import { beforeEach, expect, test, vi } from "vitest"

const mockFns = vi.hoisted(() => ({
  verifyPayPalWebhookSignature: vi.fn(),
  processPayPalWebhookEvent: vi.fn(),
  incrementCheckoutMetric: vi.fn(),
}))

vi.mock("@/lib/paypal", () => ({
  verifyPayPalWebhookSignature: mockFns.verifyPayPalWebhookSignature,
}))

vi.mock("@/modules/flights/checkout/server/service", () => ({
  processPayPalWebhookEvent: mockFns.processPayPalWebhookEvent,
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
  mockFns.verifyPayPalWebhookSignature.mockResolvedValue(true)
  mockFns.processPayPalWebhookEvent.mockResolvedValue(undefined)

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
  expect(mockFns.verifyPayPalWebhookSignature).toHaveBeenCalledWith(
    expect.objectContaining({
      event,
    })
  )
  expect(mockFns.processPayPalWebhookEvent).toHaveBeenCalledWith({ event })
})

test("POST returns 400 for an invalid PayPal signature", async () => {
  mockFns.verifyPayPalWebhookSignature.mockResolvedValue(false)

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
