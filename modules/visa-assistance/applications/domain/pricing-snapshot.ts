import { z } from "zod"

const moneySchema = z.object({
  amount: z.string(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  scale: z.number().int().min(0).max(12),
})

const feeSchema = z.object({
  feeComponent: z.enum(["processing_fee", "government_fee"]),
  sourceMoney: moneySchema,
  markupMoney: moneySchema,
  sellMoney: moneySchema,
  appliedRuleId: z.string().nullable(),
  appliedRuleName: z.string().nullable(),
  appliedRuleSpecificity: z.number().int().nullable(),
})

export const visaApplicationPricingSnapshotSchema = z.object({
  processingFee: feeSchema.nullable(),
  governmentFee: feeSchema.nullable(),
  totalSellMoney: moneySchema.nullable(),
  pricedAt: z.string().datetime(),
})

export type VisaApplicationPricingSnapshot = z.infer<
  typeof visaApplicationPricingSnapshotSchema
>

export function areVisaApplicationPricesEquivalent(
  left: VisaApplicationPricingSnapshot,
  right: VisaApplicationPricingSnapshot
) {
  const leftPricing = pricingComponents(left)
  const rightPricing = pricingComponents(right)

  return stableJson(leftPricing) === stableJson(rightPricing)
}

function pricingComponents(snapshot: VisaApplicationPricingSnapshot) {
  return {
    processingFee: snapshot.processingFee,
    governmentFee: snapshot.governmentFee,
    totalSellMoney: snapshot.totalSellMoney,
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right)
    )
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`
  }

  return JSON.stringify(value)
}
