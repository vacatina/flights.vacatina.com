import { z } from "zod"
import {
  getCurrencyPrecision,
  isDisplayCurrencyCode,
} from "@/modules/currency/domain/registry"
import type { VisaListingSnapshot } from "./listing-snapshot"

const moneySchema = z
  .object({
    amount: z.string().regex(/^\d+$/),
    currency: z.string().refine(isDisplayCurrencyCode),
    scale: z.number().int().min(0).max(3),
  })
  .refine(
    (money) => money.scale === getCurrencyPrecision(money.currency),
    "Invalid currency precision"
  )

export const visaApplicationPricingSnapshotSchema = z.object({
  totalMoney: moneySchema,
  travelerCount: z.number().int().min(1).max(10),
  pricedAt: z.iso.datetime(),
})

export type VisaApplicationPricingSnapshot = z.infer<
  typeof visaApplicationPricingSnapshotSchema
>

export function createApplicationPricing(
  snapshot: VisaListingSnapshot,
  travelerCount: number,
  pricedAt = new Date().toISOString()
): VisaApplicationPricingSnapshot {
  z.number().int().min(1).max(10).parse(travelerCount)
  const currency = snapshot.feeCurrency
  const scale = getCurrencyPrecision(currency)
  const total = BigInt(snapshot.priceMinor) * BigInt(travelerCount)
  return visaApplicationPricingSnapshotSchema.parse({
    totalMoney: {
      amount: total.toString(),
      currency,
      scale,
    },
    travelerCount,
    pricedAt,
  })
}

export function areVisaApplicationPricesEquivalent(
  left: VisaApplicationPricingSnapshot,
  right: VisaApplicationPricingSnapshot
) {
  return (
    left.travelerCount === right.travelerCount &&
    left.totalMoney.amount === right.totalMoney.amount &&
    left.totalMoney.currency === right.totalMoney.currency &&
    left.totalMoney.scale === right.totalMoney.scale
  )
}
