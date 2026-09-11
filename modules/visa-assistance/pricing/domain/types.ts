import type { SerializedMoney } from "@/modules/currency/domain"

export type VisaPricingAdjustmentType = "percent" | "fixed"
export type VisaPricingFeeComponent = "processing_fee" | "government_fee"

export interface VisaPricingRule {
  id: string
  name: string
  enabled: boolean
  priority: number
  feeComponent: VisaPricingFeeComponent
  adjustmentType: VisaPricingAdjustmentType
  adjustmentAmount: string
  adjustmentScale: number
  adjustmentCurrency: string | null
  nationalityCode: string | null
  destinationCode: string | null
  visaTypeId: string | null
  providerProductId: string | null
  activeFrom: Date | null
  activeTo: Date | null
  createdBy: string | null
  updatedBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface VisaPricingContext {
  nationalityCode: string
  destinationCode: string
  visaTypeId: string | null
  providerProductId: string | null
  feeComponent: VisaPricingFeeComponent
  sourceCurrency: string
}

export interface MatchedVisaPricingRule {
  rule: VisaPricingRule
  specificity: number
}

export interface VisaFeePricing {
  feeComponent: VisaPricingFeeComponent
  sourceMoney: SerializedMoney
  markupMoney: SerializedMoney
  sellMoney: SerializedMoney
  appliedRuleId: string | null
  appliedRuleName: string | null
  appliedRuleSpecificity: number | null
}

export interface VisaProductPricing {
  processingFee: VisaFeePricing | null
  governmentFee: VisaFeePricing | null
  totalSellMoney: SerializedMoney | null
}
