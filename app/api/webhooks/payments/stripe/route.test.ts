import type Stripe from "stripe"
import { beforeEach, expect, test, vi } from "vitest"

const mockFns = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  processStripeWebhookEvent: vi.fn(),
  incrementCheckoutMetric: vi.fn(),
}))

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    webhooks: {
      constructEvent: mockFns.constructEvent,
    },
  }),
  getStripeConfig: () => ({
    secretKey: "sk_test_123",
    webhookSecret: "whsec_test_123",
    appBaseUrl: "https://example.com",
  }),
}))

vi.mock("@/modules/flights/checkout/server/service", () => ({
  processStripeWebhookEvent: mockFns.processStripeWebhookEvent,
}))

vi.mock("@/modules/flights/checkout/server/metrics", () => ({
  incrementCheckoutMetric: mockFns.incrementCheckoutMetric,
}))

import { POST } from "@/app/api/webhooks/payments/stripe/route"

beforeEach(() => {
  vi.clearAllMocks()
})

test("POST returns 200 for a valid Stripe webhook", async () => {
  const event = {
    id: "evt_1",
    type: "checkout.session.completed",
  } as Stripe.Event
  mockFns.constructEvent.mockReturnValue(event)
  mockFns.processStripeWebhookEvent.mockResolvedValue(undefined)

  const response = await POST(
    new Request("https://example.com/api/webhooks/payments/stripe", {
      method: "POST",
      body: JSON.stringify({ id: "evt_1" }),
      headers: {
        "stripe-signature": "sig_test_123",
      },
    }) as never
  )

  expect(response.status).toBe(200)
  expect(mockFns.constructEvent).toHaveBeenCalledWith(
    JSON.stringify({ id: "evt_1" }),
    "sig_test_123",
    "whsec_test_123"
  )
  expect(mockFns.processStripeWebhookEvent).toHaveBeenCalledWith({ event })
})

test("POST returns 400 for an invalid Stripe signature", async () => {
  mockFns.constructEvent.mockImplementation(() => {
    throw new Error("Invalid signature")
  })

  const response = await POST(
    new Request("https://example.com/api/webhooks/payments/stripe", {
      method: "POST",
      body: JSON.stringify({ id: "evt_1" }),
      headers: {
        "stripe-signature": "sig_test_123",
      },
    }) as never
  )

  expect(response.status).toBe(400)
  expect(mockFns.incrementCheckoutMetric).toHaveBeenCalledWith(
    "stripe_webhook_invalid_sig_total",
    expect.objectContaining({
      reason: "Invalid signature",
    })
  )
})
