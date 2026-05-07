import "server-only"

import Stripe from "stripe"

import { currencyMinorUnit } from "@/modules/flights/pricing/domain"

export interface StripeConfig {
  secretKey: string
  webhookSecret: string
  appBaseUrl: string
}

let cachedStripe: Stripe | null = null
let cachedConfig: StripeConfig | null = null

export function getStripeConfig(): StripeConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  cachedConfig = {
    secretKey: requiredEnv("STRIPE_SECRET_KEY"),
    webhookSecret: requiredEnv("STRIPE_WEBHOOK_SECRET"),
    appBaseUrl: trimTrailingSlash(requiredEnv("STRIPE_APP_BASE_URL")),
  }

  return cachedConfig
}

export function getStripeClient(): Stripe {
  if (cachedStripe) {
    return cachedStripe
  }

  const config = getStripeConfig()

  cachedStripe = new Stripe(config.secretKey, {
    apiVersion: "2026-04-22.dahlia",
  })

  return cachedStripe
}

export function toStripeAmountMinorUnit(amount: number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase()
  const digits = currencyMinorUnit(normalizedCurrency)
  const factor = 10 ** digits
  return Math.round(amount * factor)
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required Stripe env var: ${name}`)
  }

  return value
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}
