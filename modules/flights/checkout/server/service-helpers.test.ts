import { describe, expect, test, vi } from "vitest"

import {
  createTerminalCheckoutSnapshot,
  toStripeEventKey,
} from "@/modules/flights/checkout/server/service-helpers"

vi.mock("server-only", () => ({}))

describe("createTerminalCheckoutSnapshot", () => {
  test("keeps only operational summary fields", () => {
    const snapshot = createTerminalCheckoutSnapshot({
      partialOfferRequestId: "prq_1",
      offerId: "off_1",
      quoteId: "pqt_1",
      selectedPartialOffers: [" off_1_0 ", "off_1_1"],
      paymentMode: "pay_now",
      sourceCurrency: "USD",
      netTotal: 100,
      sellTotal: 110,
      ancillaryServicesCount: 2,
      metadataKeys: ["checkout_quote_id"],
    })

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      snapshotType: "checkout_terminal_summary",
      partialOfferRequestId: "prq_1",
      offerId: "off_1",
      quoteId: "pqt_1",
      selectedPartialOffers: ["off_1_0", "off_1_1"],
      paymentMode: "pay_now",
      sourceCurrency: "USD",
      netTotal: 100,
      sellTotal: 110,
      ancillaryServicesCount: 2,
      metadataKeys: ["checkout_quote_id"],
    })

    expect(snapshot).not.toHaveProperty("contact")
    expect(snapshot).not.toHaveProperty("passengers")
    expect(snapshot).not.toHaveProperty("metadata")
  })
})

describe("toStripeEventKey", () => {
  test("normalizes the event id for idempotency", () => {
    expect(toStripeEventKey(" evt_123 ")).toBe("evt_123")
  })
})
