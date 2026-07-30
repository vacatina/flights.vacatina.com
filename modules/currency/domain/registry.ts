import type {
  CurrencyDefinition,
  DisplayCurrencyCode,
} from "@/modules/currency/domain/types"

export const DEFAULT_DISPLAY_CURRENCY: DisplayCurrencyCode = "LKR"
export const DISPLAY_CURRENCY_COOKIE_NAME = "vacatina_display_currency"

export const CURRENCY_REGISTRY = [
  {
    code: "LKR",
    name: "Sri Lankan Rupee",
    symbol: "Rs",
    precision: 2,
    displayEnabled: true,
    paymentSupported: false,
    sortOrder: 10,
  },
  {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    precision: 2,
    displayEnabled: true,
    paymentSupported: false,
    sortOrder: 20,
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    precision: 2,
    displayEnabled: true,
    paymentSupported: true,
    sortOrder: 30,
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    precision: 2,
    displayEnabled: true,
    paymentSupported: true,
    sortOrder: 40,
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    precision: 2,
    displayEnabled: true,
    paymentSupported: true,
    sortOrder: 50,
  },
  {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    precision: 2,
    displayEnabled: true,
    paymentSupported: true,
    sortOrder: 60,
  },
  {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "C$",
    precision: 2,
    displayEnabled: true,
    paymentSupported: true,
    sortOrder: 70,
  },
  {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    precision: 2,
    displayEnabled: true,
    paymentSupported: true,
    sortOrder: 80,
  },
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    precision: 2,
    displayEnabled: true,
    paymentSupported: false,
    sortOrder: 90,
  },
  {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "ر.س",
    precision: 2,
    displayEnabled: true,
    paymentSupported: false,
    sortOrder: 100,
  },
  {
    code: "QAR",
    name: "Qatari Riyal",
    symbol: "ر.ق",
    precision: 2,
    displayEnabled: true,
    paymentSupported: false,
    sortOrder: 110,
  },
  {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    precision: 0,
    displayEnabled: true,
    paymentSupported: true,
    sortOrder: 120,
  },
] as const satisfies readonly CurrencyDefinition[]

const registryByCode = new Map(
  CURRENCY_REGISTRY.map((definition) => [definition.code, definition])
)

const ZERO_PRECISION_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "UYI",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
])

const THREE_PRECISION_CURRENCIES = new Set([
  "BHD",
  "IQD",
  "JOD",
  "KWD",
  "LYD",
  "OMR",
  "TND",
])

export function isDisplayCurrencyCode(value: unknown): value is DisplayCurrencyCode {
  return (
    typeof value === "string" &&
    registryByCode.get(value as DisplayCurrencyCode)?.displayEnabled === true
  )
}

export function parseDisplayCurrency(value: unknown): DisplayCurrencyCode {
  return isDisplayCurrencyCode(value) ? value : DEFAULT_DISPLAY_CURRENCY
}

export function getCurrencyDefinition(code: DisplayCurrencyCode) {
  return registryByCode.get(code)!
}

export function getCurrencyPrecision(currency: string) {
  const normalized = currency.trim().toUpperCase()
  const registered = registryByCode.get(normalized as DisplayCurrencyCode)

  if (registered) {
    return registered.precision
  }

  if (ZERO_PRECISION_CURRENCIES.has(normalized)) {
    return 0
  }

  if (THREE_PRECISION_CURRENCIES.has(normalized)) {
    return 3
  }

  return 2
}
