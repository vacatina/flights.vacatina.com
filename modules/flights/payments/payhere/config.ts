import "server-only"

import { isProductionEnvironment, parseNumberFromEnv } from "@/lib/shared/env"

const DEFAULT_SCRIPT_URL = "https://www.payhere.lk/lib/payhere.js"
const DEFAULT_NOTIFY_PATH = "/api/payments/payhere/notify"
const DEFAULT_FX_BUFFER_PERCENT = 3
const DEFAULT_MARKUP_RATE_PERCENT = 0
const DEFAULT_MARKUP_FIXED_LKR = 0
const DEFAULT_TEST_FIXED_AMOUNT_LKR = 0

export interface PayHereConfig {
  merchantId: string
  merchantSecret: string
  sandbox: boolean
  scriptUrl: string
  notifyUrl: string
  returnUrl: string
  cancelUrl: string
  fxBufferPercent: number
  markupRatePercent: number
  markupFixedLkr: number
  testFixedAmountLkr: number | null
}

let cachedConfig: PayHereConfig | null = null

export function getPayHereConfig(): PayHereConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const merchantId = requiredEnv("PAYHERE_MERCHANT_ID")
  const merchantSecret = requiredEnv("PAYHERE_MERCHANT_SECRET")
  const appBaseUrl = requiredEnv("PAYHERE_APP_BASE_URL")
  const sandbox = parseBooleanEnv(
    "PAYHERE_SANDBOX",
    !isProductionEnvironment()
  )
  const scriptUrl = process.env.PAYHERE_SCRIPT_URL?.trim() || DEFAULT_SCRIPT_URL
  const notifyUrl = withPath(
    process.env.PAYHERE_NOTIFY_URL?.trim() || appBaseUrl,
    process.env.PAYHERE_NOTIFY_URL?.trim() ? "" : DEFAULT_NOTIFY_PATH
  )
  const returnUrl = process.env.PAYHERE_RETURN_URL?.trim() || appBaseUrl
  const cancelUrl = process.env.PAYHERE_CANCEL_URL?.trim() || appBaseUrl

  cachedConfig = {
    merchantId,
    merchantSecret,
    sandbox,
    scriptUrl,
    notifyUrl,
    returnUrl,
    cancelUrl,
    fxBufferPercent: clamp(parseNumberFromEnv("PAYHERE_FX_BUFFER_PERCENT", DEFAULT_FX_BUFFER_PERCENT), 0, 20),
    markupRatePercent: clamp(parseNumberFromEnv("PAYHERE_MARKUP_RATE_PERCENT", DEFAULT_MARKUP_RATE_PERCENT), 0, 200),
    markupFixedLkr: clamp(parseNumberFromEnv("PAYHERE_MARKUP_FIXED_LKR", DEFAULT_MARKUP_FIXED_LKR), 0, 1_000_000),
    testFixedAmountLkr: resolveTestFixedAmount(),
  }

  return cachedConfig
}

function resolveTestFixedAmount() {
  // Guardrail: never allow test amount override in production.
  if (isProductionEnvironment()) {
    return null
  }

  const value = clamp(
    parseNumberFromEnv("PAYHERE_TEST_FIXED_AMOUNT_LKR", DEFAULT_TEST_FIXED_AMOUNT_LKR),
    0,
    1_000_000
  )

  return value > 0 ? value : null
}

function withPath(base: string, path: string) {
  if (!path) {
    return base
  }

  return `${base.replace(/\/+$/, "")}${path}`
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required PayHere env var: ${name}`)
  }

  return value
}

function parseBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name]

  if (!raw) {
    return fallback
  }

  const normalized = raw.trim().toLowerCase()
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true
  }

  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false
  }

  return fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
