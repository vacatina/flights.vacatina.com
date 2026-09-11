import { describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import type { VisaPricingRule } from "@/modules/visa-assistance/pricing/domain"
import {
  createVisaPricingRule,
  setVisaPricingRuleEnabled,
} from "@/modules/visa-assistance/pricing/server/admin-service"
import type { VisaPricingRuleRepository } from "@/modules/visa-assistance/pricing/server/rule-repository"

const now = new Date("2026-09-10T10:00:00.000Z")

describe("visa pricing admin service", () => {
  test("normalizes admin input before persistence", async () => {
    const repository = createRepository()

    await createVisaPricingRule(
      {
        name: "  Sri Lanka to UAE  ",
        priority: 10,
        feeComponent: "processing_fee",
        adjustmentType: "percent",
        adjustmentValue: "12.5",
        nationalityCode: "lk",
        destinationCode: "ae",
        actorUserId: "user_1",
      },
      repository
    )

    expect(repository.create).toHaveBeenCalledWith({
      actorUserId: "user_1",
      reason: null,
      rule: expect.objectContaining({
        name: "Sri Lanka to UAE",
        adjustmentAmount: "125000",
        adjustmentScale: 4,
        nationalityCode: "LK",
        destinationCode: "AE",
      }),
    })
  })

  test("rejects an overlapping rule at the same scope and priority", async () => {
    const repository = createRepository([createRule({ name: "Existing" })])

    await expect(
      createVisaPricingRule(
        {
          name: "Duplicate",
          priority: 0,
          feeComponent: "processing_fee",
          adjustmentType: "percent",
          adjustmentValue: "15",
          actorUserId: "user_1",
        },
        repository
      )
    ).rejects.toThrow("overlaps with “Existing”")
    expect(repository.create).not.toHaveBeenCalled()
  })

  test("prevents enabling a disabled rule that would be ambiguous", async () => {
    const disabled = createRule({ id: "disabled", enabled: false })
    const repository = createRepository([
      disabled,
      createRule({ id: "active", name: "Active default" }),
    ])
    vi.mocked(repository.findById).mockResolvedValue(disabled)

    await expect(
      setVisaPricingRuleEnabled(
        { id: disabled.id, enabled: true, actorUserId: "user_1" },
        repository
      )
    ).rejects.toThrow("overlaps with “Active default”")
    expect(repository.setEnabled).not.toHaveBeenCalled()
  })
})

function createRepository(
  rules: VisaPricingRule[] = []
): VisaPricingRuleRepository {
  return {
    listActiveCandidates: vi.fn().mockResolvedValue(rules),
    listAll: vi.fn().mockResolvedValue(rules),
    findById: vi.fn().mockResolvedValue(null),
    listRecentEvents: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation(async ({ rule }) => ({
      ...createRule(),
      ...rule,
    })),
    update: vi.fn(),
    setEnabled: vi.fn(),
  }
}

function createRule(overrides: Partial<VisaPricingRule> = {}): VisaPricingRule {
  return {
    id: "rule",
    name: "Default processing markup",
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
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}
