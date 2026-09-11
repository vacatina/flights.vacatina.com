import "server-only"

import { serializeMoney } from "@/modules/currency/domain"
import type {
  VisaDocument,
  VisaProductOption,
} from "@/modules/visa-assistance/domain"
import {
  addVisaMoney,
  matchVisaPricingRule,
  priceVisaFee,
  type VisaPricingFeeComponent,
  type VisaPricingRule,
  type VisaProductPricing,
} from "@/modules/visa-assistance/pricing/domain"

export function calculateVisaProductPricing(input: {
  nationalityCode: string
  destinationCode: string
  document: VisaDocument
  product: VisaProductOption
  rules: readonly VisaPricingRule[]
  now?: Date
}): VisaProductPricing {
  const sourceCurrency = normalizeCurrency(
    input.product.validity?.base_price?.currency
  )
  const visaTypeId = normalizeId(
    input.document.visa_type_id ?? input.product.id
  )
  const providerProductId = normalizeId(
    input.product.product_id ?? input.document.product_id
  )

  const processingFee = createFeePricing({
    component: "processing_fee",
    value: input.product.validity?.base_price?.price,
    sourceCurrency,
    input,
    visaTypeId,
    providerProductId,
  })
  const governmentFee = createFeePricing({
    component: "government_fee",
    value: input.product.pricing?.visa_cost ?? input.product.validity?.gov_fee,
    sourceCurrency,
    input,
    visaTypeId,
    providerProductId,
  })

  return {
    processingFee,
    governmentFee,
    totalSellMoney: addVisaMoney(
      processingFee?.sellMoney ?? null,
      governmentFee?.sellMoney ?? null
    ),
  }
}

function createFeePricing(input: {
  component: VisaPricingFeeComponent
  value: unknown
  sourceCurrency: string | null
  input: Parameters<typeof calculateVisaProductPricing>[0]
  visaTypeId: string | null
  providerProductId: string | null
}) {
  const value = normalizeDecimal(input.value)
  if (!value || !input.sourceCurrency) return null

  const context = {
    nationalityCode: input.input.nationalityCode,
    destinationCode: input.input.destinationCode,
    visaTypeId: input.visaTypeId,
    providerProductId: input.providerProductId,
    feeComponent: input.component,
    sourceCurrency: input.sourceCurrency,
  }
  const matchedRule = matchVisaPricingRule(
    context,
    input.input.rules,
    input.input.now
  )

  return priceVisaFee(
    serializeMoney(value, input.sourceCurrency),
    context,
    matchedRule
  )
}

function normalizeDecimal(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null
  }
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(normalized)
    ? normalized
    : null
}

function normalizeCurrency(value: unknown) {
  if (typeof value !== "string") return null
  const normalized = value.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null
}

function normalizeId(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null
  const normalized = String(value).trim()
  return normalized || null
}
