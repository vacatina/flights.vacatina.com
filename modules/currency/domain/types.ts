export type DisplayCurrencyCode =
  | "LKR"
  | "INR"
  | "USD"
  | "EUR"
  | "GBP"
  | "AUD"
  | "CAD"
  | "SGD"
  | "AED"
  | "SAR"
  | "QAR"
  | "JPY"

export interface CurrencyDefinition {
  code: DisplayCurrencyCode
  name: string
  symbol: string
  precision: number
  displayEnabled: boolean
  paymentSupported: boolean
  sortOrder: number
}

export interface SerializedMoney {
  /**
   * Integer amount at `scale`, serialized as a string so it can safely cross
   * React Server Component and JSON boundaries.
   */
  amount: string
  currency: string
  scale: number
}

export interface SerializedFxRate {
  amount: string
  scale: number
}

export interface SerializedFxSnapshot {
  baseCurrency: "USD"
  rates: Record<string, SerializedFxRate>
  providerUpdatedAt: string
  fetchedAt: string
  stale: boolean
}

export interface FormattedMoney {
  label: string
  currency: string
  converted: boolean
  stale: boolean
}
