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
    })

    expect(result.eligibleDocuments[0]?.product?.id).toBe(7)
  })
})
