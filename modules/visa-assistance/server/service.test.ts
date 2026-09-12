import { describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { getVisaAssistanceResult } from "./service"

describe("visa assistance service", () => {
  test("joins eligible requirements to product options using normalized IDs", async () => {
    const fetchRequirements = vi.fn().mockResolvedValue({
      data: {
        outcome: "visa_supported",
        documents: {
          eligible: [{ visa_type_id: 42, name: "Tourist eVisa" }],
          ineligible: [],
        },
      },
      metadata: { source: "ivisa-live", capturedAt: null },
    })
    const fetchProducts = vi.fn().mockResolvedValue({
      data: {
        options: [
          { id: "42", product_name: "Tourist eVisa" },
          { id: 99, product_name: "Unrelated product" },
        ],
      },
      metadata: { source: "ivisa-live", capturedAt: null },
    })

    const result = await getVisaAssistanceResult("in", "ae", {
      fetchRequirements,
      fetchProducts,
      pricingRuleRepository: {
        listActiveCandidates: vi.fn().mockResolvedValue([]),
      },
    })

    expect(result.nationality).toBe("IN")
    expect(result.destination).toBe("AE")
    expect(result.eligibleDocuments[0]?.product?.id).toBe("42")
    expect(fetchRequirements).toHaveBeenCalledWith("IN", "AE")
    expect(fetchProducts).toHaveBeenCalledWith("IN", "AE")
  })

  test("uses nationality eligibility when an ID match is unavailable", async () => {
    const fetchRequirements = vi.fn().mockResolvedValue({
      data: {
        outcome: "visa_supported",
        documents: { eligible: [{ name: "Travel visa" }] },
      },
      metadata: { source: "ivisa-live", capturedAt: null },
    })
    const fetchProducts = vi.fn().mockResolvedValue({
      data: {
        options: [{ id: 7, eligible_nationalities: ["LK"] }],
      },
      metadata: { source: "ivisa-live", capturedAt: null },
    })

    const result = await getVisaAssistanceResult("LK", "SG", {
      fetchRequirements,
      fetchProducts,
      pricingRuleRepository: {
        listActiveCandidates: vi.fn().mockResolvedValue([]),
      },
    })

    expect(result.eligibleDocuments[0]?.product?.id).toBe(7)
  })

  test("adds server-calculated sell pricing to matched visa products", async () => {
    const fetchRequirements = vi.fn().mockResolvedValue({
      data: {
        outcome: "visa_supported",
        documents: { eligible: [{ visa_type_id: 42, name: "Tourist eVisa" }] },
      },
      metadata: { source: "ivisa-live", capturedAt: null },
    })
    const fetchProducts = vi.fn().mockResolvedValue({
      data: {
        options: [
          {
            id: 42,
            product_id: 10139,
            validity: {
              base_price: { price: "70.99", currency: "USD" },
              gov_fee: "110",
            },
            pricing: { visa_cost: "110.00" },
          },
        ],
      },
      metadata: { source: "ivisa-live", capturedAt: null },
    })
    const pricingRuleRepository = {
      listActiveCandidates: vi.fn().mockResolvedValue([
        {
          id: "rule_10_percent",
          name: "Processing default",
          enabled: true,
          priority: 0,
          feeComponent: "processing_fee",
          adjustmentType: "percent",
          adjustmentAmount: "100000",
          adjustmentScale: 4,
          adjustmentCurrency: null,
          nationalityCode: null,
          destinationCode: null,
          visaTypeId: null,
          providerProductId: null,
          activeFrom: null,
          activeTo: null,
          createdBy: null,
          updatedBy: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]),
    }

    const result = await getVisaAssistanceResult("LK", "AE", {
      fetchRequirements,
      fetchProducts,
      pricingRuleRepository,
      now: () => new Date("2026-09-10T00:00:00.000Z"),
    })

    expect(result.eligibleDocuments[0]?.pricing).toMatchObject({
      processingFee: {
        sourceMoney: { amount: "7099", currency: "USD", scale: 2 },
        markupMoney: { amount: "710", currency: "USD", scale: 2 },
        sellMoney: { amount: "7809", currency: "USD", scale: 2 },
        appliedRuleId: "rule_10_percent",
      },
      governmentFee: {
        sourceMoney: { amount: "11000", currency: "USD", scale: 2 },
        markupMoney: { amount: "0", currency: "USD", scale: 2 },
        sellMoney: { amount: "11000", currency: "USD", scale: 2 },
      },
      totalSellMoney: { amount: "18809", currency: "USD", scale: 2 },
    })
  })
})
