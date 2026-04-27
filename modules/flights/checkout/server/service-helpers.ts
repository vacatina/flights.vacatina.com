import "server-only"

import { createHash, randomUUID } from "node:crypto"

import { isValid, parseISO } from "date-fns"

import type { ActorContext } from "@/modules/auth/types"
import { GUEST_UNAVAILABLE_ID } from "@/modules/auth/constants"
import type { CheckoutSessionStatus } from "@/modules/flights/checkout/server/session-repository"
import { currencyMinorUnit } from "@/modules/flights/pricing/domain"
import { toNumeric } from "@/lib/shared/number"
import { normalizeSelectedStrings } from "@/lib/shared/selection"

export function doesSessionOwnerMatch(
  session: {
    ownerUserId: string | null
    ownerGuestId: string | null
  },
  actor: ActorContext
) {
  if (actor.type === "user") {
    return session.ownerUserId === actor.appUserId
  }

  if (actor.guestId === GUEST_UNAVAILABLE_ID) {
    return false
  }

  return session.ownerGuestId === actor.guestId
}

export function statusToMessage(input: {
  status: CheckoutSessionStatus
  errorCode: string | null
}) {
  switch (input.status) {
    case "processing":
      return "Payment is processing. Waiting for confirmation."
    case "payment_authorized":
      return "Payment received. Finalizing booking."
    case "failed":
      if (input.errorCode === "checkout_submit_failed") {
        return "Checkout could not be completed right now. Please try again."
      }
      return "Payment failed. Please retry checkout."
    case "reconciliation_required":
      return "Payment received but booking is pending manual reconciliation."
    case "completed":
    default:
      return null
  }
}

export function toPayNowUnavailableReason(error: unknown) {
  if (
    error instanceof Error &&
    error.message.startsWith("PayHere pay_now is unavailable for")
  ) {
    return error.message
  }

  return "Pay now is unavailable right now. Please try hold order."
}

export function isPaymentAmountMatch(input: {
  expectedAmount: number | null
  expectedCurrency: string | null
  actualAmount: string
  actualCurrency: string
}) {
  if (input.expectedAmount === null || !input.expectedCurrency) {
    return false
  }

  const expectedCurrency = input.expectedCurrency.trim().toUpperCase()
  const actualCurrency = input.actualCurrency.trim().toUpperCase()

  if (expectedCurrency !== actualCurrency) {
    return false
  }

  const expectedAmount = roundToCurrency(input.expectedAmount, expectedCurrency)
  const actualAmount = roundToCurrency(toNumeric(input.actualAmount), actualCurrency)

  return Math.abs(expectedAmount - actualAmount) < 0.01
}

export function toPayHereEventKey(input: {
  orderId: string
  paymentId: string
  statusCode: string
  amount: string
  currency: string
}) {
  return `${input.orderId}:${input.paymentId}:${input.statusCode}:${input.amount}:${input.currency}`
}

export function createWebhookEventId() {
  return `pwe_${randomUUID().replaceAll("-", "")}`
}

export function createCheckoutSessionId() {
  return `chs_${randomUUID().replaceAll("-", "")}`
}

export function createFlightOrderId() {
  return `fod_${randomUUID().replaceAll("-", "")}`
}

export function toQuoteOwner(actor: ActorContext) {
  if (actor.type === "user") {
    return {
      userId: actor.appUserId,
      guestId: null,
    }
  }

  return {
    userId: null,
    guestId: actor.guestId === GUEST_UNAVAILABLE_ID ? null : actor.guestId,
  }
}

export function toQuoteValidationErrorMessage(reason: string | null) {
  switch (reason) {
    case "not_found":
      return "Checkout quote not found. Please go back and try again."
    case "not_active":
      return "Checkout quote is no longer active. Please regenerate it."
    case "expired":
      return "Checkout quote expired. Please return to review."
    case "owner_mismatch":
      return "Checkout quote owner mismatch. Please restart checkout."
    case "offer_mismatch":
    case "partial_offer_request_mismatch":
    case "selected_mismatch":
      return "Checkout quote does not match current selection."
    default:
      return "Checkout quote validation failed."
  }
}

export function buildCheckoutIdempotencyKey(input: {
  partialOfferRequestId: string
  quoteId: string
  offerId: string
  paymentMode: "pay_now" | "hold"
  owner: {
    userId: string | null
    guestId: string | null
  }
  selectedPartialOffers: string[]
  passengers: unknown
  services: unknown
  metadata: Record<string, string>
  netTotal: number
  sellTotal: number
  billing: {
    address: string
    city: string
    country: string
  } | null
}) {
  const payload = JSON.stringify({
    partialOfferRequestId: input.partialOfferRequestId,
    quoteId: input.quoteId,
    offerId: input.offerId,
    paymentMode: input.paymentMode,
    owner: input.owner,
    selectedPartialOffers: input.selectedPartialOffers,
    passengers: input.passengers,
    services: input.services,
    metadata: input.metadata,
    netTotal: input.netTotal,
    sellTotal: input.sellTotal,
    billing: input.billing,
  })

  return createHash("sha256").update(payload).digest("hex")
}

export function parseOptionalDate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

export function roundToCurrency(value: number, currency: string) {
  const digits = currencyMinorUnit(currency.trim().toUpperCase())
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function toAmountString(value: number, currency: string) {
  const rounded = roundToCurrency(value, currency)
  const digits = currencyMinorUnit(currency.trim().toUpperCase())
  return rounded.toFixed(digits)
}

export function createTerminalCheckoutSnapshot(input: {
  partialOfferRequestId: string
  offerId: string
  quoteId: string
  selectedPartialOffers: string[]
  paymentMode: "pay_now" | "hold"
  sourceCurrency: string
  netTotal: number
  sellTotal: number
  ancillaryServicesCount?: number
  metadataKeys?: string[]
}) {
  return {
    schemaVersion: 1,
    snapshotType: "checkout_terminal_summary",
    partialOfferRequestId: input.partialOfferRequestId,
    offerId: input.offerId,
    quoteId: input.quoteId,
    selectedPartialOffers: normalizeSelectedStrings(input.selectedPartialOffers),
    paymentMode: input.paymentMode,
    sourceCurrency: input.sourceCurrency,
    netTotal: input.netTotal,
    sellTotal: input.sellTotal,
    ancillaryServicesCount: input.ancillaryServicesCount ?? 0,
    metadataKeys: input.metadataKeys ?? [],
    createdAt: new Date().toISOString(),
  }
}
