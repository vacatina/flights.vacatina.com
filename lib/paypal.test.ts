import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  getPayPalConfig,
  resetPayPalClientForTests,
  toPayPalAmount,
} from "@/lib/paypal"

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  resetPayPalClientForTests()
})

describe("getPayPalConfig", () => {
  test("uses sandbox base URL by default", () => {
    process.env.PAYPAL_CLIENT_ID = "client_test"
    process.env.PAYPAL_CLIENT_SECRET = "secret_test"
    process.env.PAYPAL_WEBHOOK_ID = "webhook_test"
    delete process.env.PAYPAL_ENV

    expect(getPayPalConfig()).toMatchObject({
      environment: "sandbox",
      baseUrl: "https://api-m.sandbox.paypal.com",
    })
  })

  test("uses live base URL when PAYPAL_ENV is live", () => {
    process.env.PAYPAL_ENV = "live"
    process.env.PAYPAL_CLIENT_ID = "client_live"
    process.env.PAYPAL_CLIENT_SECRET = "secret_live"
    process.env.PAYPAL_WEBHOOK_ID = "webhook_live"

    expect(getPayPalConfig()).toMatchObject({
      environment: "live",
      baseUrl: "https://api-m.paypal.com",
    })
  })
})

describe("toPayPalAmount", () => {
  test("formats decimal amount strings using currency minor units", () => {
    expect(toPayPalAmount(120, "usd")).toEqual({
      currency_code: "USD",
      value: "120.00",
    })
    expect(toPayPalAmount(120, "jpy")).toEqual({
      currency_code: "JPY",
      value: "120",
    })
  })
})
