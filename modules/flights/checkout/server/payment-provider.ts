import "server-only"

import { randomUUID } from "node:crypto"

import { logFlightFlow } from "@/modules/flights/shared/flow-debug"

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

export const placeholderExternalPaymentProvider: ExternalPaymentProvider = {
  async authorize(input) {
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
