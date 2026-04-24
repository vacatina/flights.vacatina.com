import "server-only"

import { randomUUID } from "node:crypto"

import { logFlightFlow } from "@/lib/logging/flow-debug"
import { isProductionEnvironment } from "@/lib/shared/env"

export interface ExternalPaymentAuthorization {
  authorizationId: string
  status: "authorized"
  provider: "placeholder"
}

export interface ExternalPaymentCapture {
  captureId: string
  status: "captured"
  provider: "placeholder"
}

export interface ExternalPaymentProvider {
  authorize(input: {
    checkoutSessionId: string
    amount: number
    currency: string
    actorType: "user" | "guest"
  }): Promise<ExternalPaymentAuthorization>
  capture(input: {
    authorizationId: string
    checkoutSessionId: string
  }): Promise<ExternalPaymentCapture>
}

const FORCE_FAIL_ENV_KEY = "CHECKOUT_PAYMENT_PLACEHOLDER_FORCE_FAIL"
const ALLOW_PLACEHOLDER_ENV_KEY = "CHECKOUT_ALLOW_PLACEHOLDER_PAYMENT_PROVIDER"

export function assertPlaceholderPaymentProviderAllowed() {
  if (!isProductionEnvironment()) {
    return
  }

  if (process.env[ALLOW_PLACEHOLDER_ENV_KEY]?.trim() === "1") {
    return
  }

  throw new Error(
    `Placeholder payment provider is disabled in production. Set ${ALLOW_PLACEHOLDER_ENV_KEY}=1 only for controlled non-live environments.`
  )
}

export const placeholderExternalPaymentProvider: ExternalPaymentProvider = {
  async authorize(input) {
    assertPlaceholderPaymentProviderAllowed()

    if (process.env[FORCE_FAIL_ENV_KEY] === "authorize") {
      throw new Error("Payment authorization failed. Please try again.")
    }

    const result: ExternalPaymentAuthorization = {
      authorizationId: `pay_auth_${randomUUID().replaceAll("-", "")}`,
      status: "authorized",
      provider: "placeholder",
    }

    logFlightFlow("checkout.paymentProvider", "authorized", {
      checkoutSessionId: input.checkoutSessionId,
      amount: input.amount,
      currency: input.currency,
      actorType: input.actorType,
      authorizationId: result.authorizationId,
    })

    return result
  },
  async capture(input) {
    assertPlaceholderPaymentProviderAllowed()

    if (process.env[FORCE_FAIL_ENV_KEY] === "capture") {
      throw new Error("Payment capture failed. Please contact support.")
    }

    const result: ExternalPaymentCapture = {
      captureId: `pay_cap_${randomUUID().replaceAll("-", "")}`,
      status: "captured",
      provider: "placeholder",
    }

    logFlightFlow("checkout.paymentProvider", "captured", {
      checkoutSessionId: input.checkoutSessionId,
      authorizationId: input.authorizationId,
      captureId: result.captureId,
    })

    return result
  },
}
