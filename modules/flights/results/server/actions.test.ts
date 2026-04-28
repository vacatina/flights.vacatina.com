import { expect, test } from "vitest"
import type { Offer, OfferRequest } from "@duffel/api/types"

import { executeCreateCheckoutQuoteAction } from "@/modules/flights/results/server/actions"

const offerFixture = {
  id: "off_1",
  owner: {
    id: "air_qr",
    iata_code: "QR",
    icao_code: "QTR",
    name: "Qatar Airways",
    logo_symbol_url: null,
    logo_lockup_url: null,
  },
  total_amount: "915.60",
  total_currency: "USD",
  slices: [],
} as unknown as Offer

test("executeCreateCheckoutQuoteAction creates quote from selected offer", async () => {
  const result = await executeCreateCheckoutQuoteAction(
    {
      partialOfferRequestId: "prq_1",
      selected: ["off_partial_1", "off_partial_2"],
      offerId: "off_1",
    },
    {
      async getFaresBySelected() {
        return {
          offers: [offerFixture],
          slices: [{}, {}],
        } as unknown as OfferRequest
      },
      async getOfferPricingMap() {
        return {
          off_1: {
            offerId: "off_1",
            currency: "USD",
            netAmount: 915.6,
            sellAmount: 990.6,
            appliedRuleId: "rule_1",
            appliedRuleSpecificity: 2,
          },
        }
      },
      async createPricedQuote() {
        return {
          id: "pqt_1",
          expiresAt: new Date("2026-04-11T12:00:00.000Z"),
        }
      },
      async getActorContext() {
        return {
          type: "guest" as const,
          guestId: "gst_test",
        }
      },
    }
  )

  expect(result.ok).toBe(true)
  expect(result.ok && result.data.quoteId).toBe("pqt_1")
})

test("executeCreateCheckoutQuoteAction creates quote for multi-city selected offers", async () => {
  const getFaresBySelected = async (
    _partialOfferRequestId: string,
    selectedPartialOffers: string[]
  ) => {
    expect(selectedPartialOffers).toEqual([
      "off_partial_1",
      "off_partial_2",
      "off_partial_3",
    ])

    return {
      offers: [offerFixture],
      slices: [{}, {}, {}],
    } as unknown as OfferRequest
  }

  const result = await executeCreateCheckoutQuoteAction(
    {
      partialOfferRequestId: "prq_1",
      selected: ["off_partial_1", "off_partial_2", "off_partial_3"],
      offerId: "off_1",
    },
    {
      getFaresBySelected,
      async getOfferPricingMap() {
        return {
          off_1: {
            offerId: "off_1",
            currency: "USD",
            netAmount: 1000,
            sellAmount: 1100,
            appliedRuleId: "rule_1",
            appliedRuleSpecificity: 2,
          },
        }
      },
      async createPricedQuote(input) {
        expect(input.selectedPartialOffers).toEqual([
          "off_partial_1",
          "off_partial_2",
          "off_partial_3",
        ])
        return {
          id: "pqt_multi_1",
          expiresAt: new Date("2026-04-11T12:00:00.000Z"),
        }
      },
      async getActorContext() {
        return {
          type: "guest" as const,
          guestId: "gst_test",
        }
      },
    }
  )

  expect(result.ok).toBe(true)
  expect(result.ok && result.data.quoteId).toBe("pqt_multi_1")
})

test("executeCreateCheckoutQuoteAction rejects missing selected offer", async () => {
  const result = await executeCreateCheckoutQuoteAction(
    {
      partialOfferRequestId: "prq_1",
      selected: ["off_partial_1", "off_partial_2"],
      offerId: "off_missing",
    },
    {
      async getFaresBySelected() {
        return {
          offers: [offerFixture],
          slices: [{}, {}],
        } as unknown as OfferRequest
      },
      async getOfferPricingMap() {
        return {}
      },
      async createPricedQuote() {
        throw new Error("should not be called")
      },
      async getActorContext() {
        return {
          type: "guest" as const,
          guestId: "gst_test",
        }
      },
    }
  )

  expect(result.ok).toBe(false)
  expect(!result.ok && result.error.code).toBe("VALIDATION_ERROR")
})

test("executeCreateCheckoutQuoteAction sanitizes quote creation errors", async () => {
  const result = await executeCreateCheckoutQuoteAction(
    {
      partialOfferRequestId: "prq_1",
      selected: ["off_partial_1"],
      offerId: "off_1",
    },
    {
      async getFaresBySelected() {
        return {
          offers: [offerFixture],
          slices: [{}],
        } as unknown as OfferRequest
      },
      async getOfferPricingMap() {
        return {
          off_1: {
            offerId: "off_1",
            currency: "USD",
            netAmount: 915.6,
            sellAmount: 990.6,
            appliedRuleId: "rule_1",
            appliedRuleSpecificity: 2,
          },
        }
      },
      async createPricedQuote() {
        throw new Error('Failed query: insert into "priced_quotes" ...')
      },
      async getActorContext() {
        return {
          type: "guest" as const,
          guestId: "gst_test",
        }
      },
    }
  )

  expect(result.ok).toBe(false)
  expect(!result.ok && result.error.code).toBe("UPSTREAM_ERROR")
  expect(!result.ok && result.error.message).toBe(
    "Could not create checkout quote right now. Please try again."
  )
})
