export type PricingAdjustmentType = "percent" | "fixed"
export type PricingJourneyType = "one_way" | "return"

export type PricedQuoteStatus = "active" | "consumed" | "expired" | "cancelled"

export interface PricingRule {
  id: string
  name: string
  enabled: boolean
  priority: number
  adjustmentType: PricingAdjustmentType
  adjustmentValue: number
  activeFrom: Date | null
  activeTo: Date | null
  journeyType: PricingJourneyType | null
  originIata: string | null
  destinationIata: string | null
  airlineIata: string | null
  cabinClass: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PricingContext {
  journeyType: PricingJourneyType
  originIata: string
  destinationIata: string
  airlineIata: string
  cabinClass: string
}

export interface MatchedPricingRule {
  rule: PricingRule
  specificity: number
}

export interface PricedAmount {
  currency: string
  netAmount: number
  sellAmount: number
  appliedRuleId: string | null
  appliedRuleSpecificity: number | null
}

export interface OfferPriceRecord extends PricedAmount {
  offerId: string
}

export interface PricedQuoteRecord extends PricedAmount {
  id: string
  partialOfferRequestId: string
  offerId: string
  selectedPartialOffers: string[]
  status: PricedQuoteStatus
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}
