import "server-only"

import { createHash, randomUUID } from "node:crypto"

import { format, isValid, parseISO } from "date-fns"
import type { CreateOrder, Offer, Order, SeatMap } from "@duffel/api/types"
import type { ActorContext } from "@/modules/auth/types"

import {
  buildCheckoutPageModel,
  computeAncillaryPricing,
  mapPassengersToCreateOrderPassengers,
  normalizeAncillarySelection,
  normalizeMetadataPairs,
  validateIdentityDocumentRequirements,
  type CheckoutPageData,
  type CheckoutSubmitInput,
  type CheckoutUrlState,
} from "@/modules/flights/checkout/domain"
import { getCheckoutServerConfig } from "@/modules/flights/checkout/server/config"
import {
  defaultFlightOrderRepository,
  type FlightOrderRepository,
} from "@/modules/flights/checkout/server/order-repository"
import {
  incrementCheckoutMetric,
} from "@/modules/flights/checkout/server/metrics"
import {
  placeholderExternalPaymentProvider,
  type ExternalPaymentProvider,
} from "@/modules/flights/checkout/server/payment-provider"
import {
  defaultCheckoutSessionRepository,
  type CheckoutSessionRepository,
} from "@/modules/flights/checkout/server/session-repository"
import { getAirlineLogosByAirlineId } from "@/modules/flights/results/server/airline-logos"
import {
  logDuffelError,
  mapDuffelErrorMessage,
} from "@/modules/flights/results/server/error-map"
import {
  formatCurrencyAmount,
  markPricedQuoteConsumed,
  validatePricedQuote,
} from "@/modules/flights/pricing/server"
import { currencyMinorUnit } from "@/modules/flights/pricing/domain"
import { logFlightFlow, logFlightFlowError } from "@/modules/flights/shared/flow-debug"

interface FetchCheckoutPageDataInput {
  partialOfferRequestId: string
  state: CheckoutUrlState
  actor: ActorContext
}

interface SubmitCheckoutInput {
  actor: ActorContext
  payload: CheckoutSubmitInput
}

interface CheckoutSubmissionSuccess {
  checkoutSessionId: string
  flightOrderId: string
  duffelOrderId: string
  paymentMode: "pay_now" | "hold"
  totalSellAmountLabel: string
  paymentRequiredByLabel: string | null
}

interface CheckoutServiceDeps {
  now: () => Date
  getOfferById: (offerId: string) => Promise<Offer>
  getSeatMapsByOfferId: (offerId: string) => Promise<SeatMap[]>
  createOrder: (payload: CreateOrder) => Promise<Order>
  paymentProvider: ExternalPaymentProvider
  sessionRepository: CheckoutSessionRepository
  orderRepository: FlightOrderRepository
}

const defaultDeps: CheckoutServiceDeps = {
  now: () => new Date(),
  async getOfferById(offerId) {
    try {
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.offers.get(offerId, {
        return_available_services: true,
      })
      return response.data as Offer
    } catch (error) {
      logDuffelError("checkout.offers.get failed", error, {
        offerId,
      })
      throw new Error(
        mapDuffelErrorMessage(error, "Could not load checkout details right now.")
      )
    }
  },
  async getSeatMapsByOfferId(offerId) {
    try {
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.seatMaps.get({
        offer_id: offerId,
      })
      return (response.data as SeatMap[]) ?? []
    } catch (error) {
      logFlightFlowError("checkout.getSeatMapsByOfferId", "fallback_to_empty", error, {
        offerId,
      })
      return []
    }
  },
  async createOrder(payload) {
    try {
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.orders.create(payload)
      return response.data as Order
    } catch (error) {
      logDuffelError("checkout.orders.create failed", error, {
        offerId: payload.selected_offers[0],
        orderType: payload.type,
      })
      throw new Error(mapDuffelErrorMessage(error, "Could not create order at the moment."))
    }
  },
  paymentProvider: placeholderExternalPaymentProvider,
  sessionRepository: defaultCheckoutSessionRepository,
  orderRepository: defaultFlightOrderRepository,
}

export async function fetchCheckoutPageData(
  input: FetchCheckoutPageDataInput,
  deps: CheckoutServiceDeps = defaultDeps
): Promise<CheckoutPageData> {
  logFlightFlow("fetchCheckoutPageData", "start", {
    partialOfferRequestId: input.partialOfferRequestId,
    offerId: input.state.offerId,
    selectedCount: input.state.selectedPartialOffers.length,
    actorType: input.actor.type,
  })

  const quoteValidation = await validatePricedQuote({
    quoteId: input.state.quoteId,
    partialOfferRequestId: input.partialOfferRequestId,
    offerId: input.state.offerId,
    selectedPartialOffers: input.state.selectedPartialOffers,
    owner: toQuoteOwner(input.actor),
  })

  if (!quoteValidation.ok || !quoteValidation.quote) {
    throw new Error(toQuoteValidationErrorMessage(quoteValidation.reason))
  }

  const offer = await deps.getOfferById(input.state.offerId)
  const seatMaps = await deps.getSeatMapsByOfferId(input.state.offerId)
  const logos = await getAirlineLogosByAirlineId([offer.owner.id])

  const model = buildCheckoutPageModel({
    partialOfferRequestId: input.partialOfferRequestId,
    state: input.state,
    offer,
    seatMaps,
    quote: {
      id: quoteValidation.quote.id,
      currency: quoteValidation.quote.currency,
      netAmount: quoteValidation.quote.netAmount,
      sellAmount: quoteValidation.quote.sellAmount,
      expiresAt: quoteValidation.quote.expiresAt,
    },
    airlineLogosByAirlineId: logos,
  })

  logFlightFlow("fetchCheckoutPageData", "completed", {
    partialOfferRequestId: input.partialOfferRequestId,
    offerId: input.state.offerId,
    seatMapCount: seatMaps.length,
    passengerCount: model.passengerDefaults.length,
  })

  return model
}

export async function submitCheckout(
  input: SubmitCheckoutInput,
  deps: CheckoutServiceDeps = defaultDeps
): Promise<CheckoutSubmissionSuccess> {
  const config = getCheckoutServerConfig()
  const now = deps.now()
  const owner = toQuoteOwner(input.actor)

  const quoteValidation = await validatePricedQuote({
    quoteId: input.payload.quoteId,
    partialOfferRequestId: input.payload.partialOfferRequestId,
    offerId: input.payload.offerId,
    selectedPartialOffers: input.payload.selectedPartialOffers,
    owner,
  })

  if (!quoteValidation.ok || !quoteValidation.quote) {
    throw new Error(toQuoteValidationErrorMessage(quoteValidation.reason))
  }

  const offer = await deps.getOfferById(input.payload.offerId)
  const ancillarySelection = normalizeAncillarySelection(input.payload.ancillarySelection)
  const ancillaryPricing = computeAncillaryPricing({
    offer,
    selectedServices: ancillarySelection.services,
    expectedCurrency: quoteValidation.quote.currency,
    markup: {
      ratePercent: config.ancillaryMarkupRatePercent,
      fixedAmount: config.ancillaryMarkupFixedAmount,
    },
  })

  if (
    input.payload.paymentMode === "hold" &&
    ancillarySelection.services.length > 0
  ) {
    throw new Error("Seats and extra baggage are only available with Pay now.")
  }

  if (input.payload.paymentMode === "hold" && offer.payment_requirements.requires_instant_payment) {
    throw new Error("This offer requires instant payment and cannot be held.")
  }

  validateIdentityDocumentRequirements({
    offer,
    passengers: input.payload.passengers,
  })

  const passengers = mapPassengersToCreateOrderPassengers({
    offer,
    passengers: input.payload.passengers,
    contact: input.payload.contact,
  })

  const metadata = normalizeMetadataPairs(input.payload.metadata)
  metadata.checkout_quote_id = input.payload.quoteId
  metadata.checkout_session_origin = "vacatina_checkout_v1"

  const netTotal = roundToCurrency(
    quoteValidation.quote.netAmount + ancillaryPricing.netTotal,
    quoteValidation.quote.currency
  )
  const sellTotal = roundToCurrency(
    quoteValidation.quote.sellAmount + ancillaryPricing.sellTotal,
    quoteValidation.quote.currency
  )
  const idempotencyKey = buildCheckoutIdempotencyKey({
    partialOfferRequestId: input.payload.partialOfferRequestId,
    quoteId: input.payload.quoteId,
    offerId: input.payload.offerId,
    paymentMode: input.payload.paymentMode,
    selectedPartialOffers: input.payload.selectedPartialOffers,
    passengers,
    services: ancillarySelection.services,
    metadata,
    netTotal,
    sellTotal,
  })

  const existingSession = await deps.sessionRepository.findByIdempotencyKey(idempotencyKey)

  if (existingSession) {
    if (existingSession.status === "completed") {
      const existingOrder = await deps.orderRepository.findByCheckoutSessionId(existingSession.id)

      if (existingOrder) {
        return {
          checkoutSessionId: existingSession.id,
          flightOrderId: existingOrder.id,
          duffelOrderId: existingOrder.duffelOrderId,
          paymentMode: existingOrder.paymentMode,
          totalSellAmountLabel: formatCurrencyAmount(
            existingOrder.sellAmount,
            existingOrder.currency
          ),
          paymentRequiredByLabel: existingOrder.paymentRequiredBy
            ? format(existingOrder.paymentRequiredBy, "dd/MM/yyyy, HH:mm")
            : null,
        }
      }
    }

    if (
      existingSession.status === "processing" ||
      existingSession.status === "payment_authorized"
    ) {
      throw new Error("Checkout is already processing. Please wait a moment.")
    }

    if (existingSession.errorMessage) {
      throw new Error(existingSession.errorMessage)
    }
  }

  const checkoutSession = await deps.sessionRepository.create({
    id: createCheckoutSessionId(),
    idempotencyKey,
    partialOfferRequestId: input.payload.partialOfferRequestId,
    quoteId: input.payload.quoteId,
    offerId: input.payload.offerId,
    selectedPartialOffers: input.payload.selectedPartialOffers,
    ownerUserId: owner.userId,
    ownerGuestId: owner.guestId,
    ownerOrgId: null,
    paymentMode: input.payload.paymentMode,
    currency: quoteValidation.quote.currency,
    netAmount: netTotal,
    sellAmount: sellTotal,
    status: "processing",
    expiresAt: new Date(now.getTime() + config.checkoutSessionTtlMinutes * 60_000),
  })

  incrementCheckoutMetric("checkout_started", {
    checkoutSessionId: checkoutSession.id,
    paymentMode: input.payload.paymentMode,
  })

  let authorizationId: string | null = null
  let captureId: string | null = null
  let duffelOrder: Order | null = null

  try {
    if (input.payload.paymentMode === "pay_now") {
      const authorization = await deps.paymentProvider.authorize({
        checkoutSessionId: checkoutSession.id,
        amount: sellTotal,
        currency: quoteValidation.quote.currency,
        actorType: input.actor.type,
      })
      authorizationId = authorization.authorizationId
      incrementCheckoutMetric("payment_authorized", {
        checkoutSessionId: checkoutSession.id,
      })

      await deps.sessionRepository.update(checkoutSession.id, {
        status: "payment_authorized",
        externalPaymentAuthorizationId: authorizationId,
      })
    }

    const orderPayload: CreateOrder = {
      selected_offers: [offer.id],
      passengers,
      type: input.payload.paymentMode === "hold" ? "pay_later" : "instant",
      metadata,
    }

    if (ancillarySelection.services.length > 0) {
      orderPayload.services = ancillarySelection.services
    }

    if (input.payload.paymentMode === "pay_now") {
      orderPayload.payments = [
        {
          type: config.settlementPaymentType,
          amount: toAmountString(netTotal, quoteValidation.quote.currency),
          currency: quoteValidation.quote.currency,
        },
      ]
    }

    duffelOrder = await deps.createOrder(orderPayload)
    incrementCheckoutMetric("order_created", {
      checkoutSessionId: checkoutSession.id,
      duffelOrderId: duffelOrder.id,
    })

    if (input.payload.paymentMode === "pay_now" && authorizationId) {
      const capture = await deps.paymentProvider.capture({
        authorizationId,
        checkoutSessionId: checkoutSession.id,
      })
      captureId = capture.captureId
    }

    const flightOrder = await deps.orderRepository.create({
      id: createFlightOrderId(),
      checkoutSessionId: checkoutSession.id,
      duffelOrderId: duffelOrder.id,
      partialOfferRequestId: input.payload.partialOfferRequestId,
      offerId: input.payload.offerId,
      selectedPartialOffers: input.payload.selectedPartialOffers,
      ownerUserId: owner.userId,
      ownerGuestId: owner.guestId,
      ownerOrgId: null,
      paymentMode: input.payload.paymentMode,
      settlementType: config.settlementPaymentType,
      currency: quoteValidation.quote.currency,
      netAmount: netTotal,
      sellAmount: sellTotal,
      duffelTotalAmount: toNumeric(duffelOrder.total_amount),
      duffelTotalCurrency: duffelOrder.total_currency,
      paymentAwaiting: duffelOrder.payment_status.awaiting_payment,
      paymentRequiredBy: parseOptionalDate(duffelOrder.payment_status.payment_required_by),
      priceGuaranteeExpiresAt: parseOptionalDate(
        duffelOrder.payment_status.price_guarantee_expires_at
      ),
      paidAt: parseOptionalDate(duffelOrder.payment_status.paid_at),
    })

    await markPricedQuoteConsumed(quoteValidation.quote.id)
    incrementCheckoutMetric("quote_consumed", {
      checkoutSessionId: checkoutSession.id,
      quoteId: quoteValidation.quote.id,
    })

    await deps.sessionRepository.update(checkoutSession.id, {
      status: "completed",
      duffelOrderId: duffelOrder.id,
      externalPaymentAuthorizationId: authorizationId,
      externalPaymentCaptureId: captureId,
      errorCode: null,
      errorMessage: null,
    })

    incrementCheckoutMetric("checkout_submit_success", {
      checkoutSessionId: checkoutSession.id,
    })

    return {
      checkoutSessionId: checkoutSession.id,
      flightOrderId: flightOrder.id,
      duffelOrderId: duffelOrder.id,
      paymentMode: input.payload.paymentMode,
      totalSellAmountLabel: formatCurrencyAmount(sellTotal, quoteValidation.quote.currency),
      paymentRequiredByLabel: flightOrder.paymentRequiredBy
        ? format(flightOrder.paymentRequiredBy, "dd/MM/yyyy, HH:mm")
        : null,
    }
  } catch (error) {
    incrementCheckoutMetric("checkout_submit_failed", {
      checkoutSessionId: checkoutSession.id,
    })
    logFlightFlowError("submitCheckout", "submit_failed", error, {
      checkoutSessionId: checkoutSession.id,
      paymentMode: input.payload.paymentMode,
      hasAuthorization: Boolean(authorizationId),
      hasOrder: Boolean(duffelOrder),
    })

    await deps.sessionRepository.update(checkoutSession.id, {
      status:
        authorizationId && !duffelOrder ? "reconciliation_required" : "failed",
      externalPaymentAuthorizationId: authorizationId,
      externalPaymentCaptureId: captureId,
      errorCode: "checkout_submit_failed",
      errorMessage: error instanceof Error ? error.message : "Checkout failed",
    })

    throw error
  }
}

function createCheckoutSessionId() {
  return `chs_${randomUUID().replaceAll("-", "")}`
}

function createFlightOrderId() {
  return `fod_${randomUUID().replaceAll("-", "")}`
}

function toQuoteOwner(actor: ActorContext) {
  if (actor.type === "user") {
    return {
      userId: actor.appUserId,
      guestId: null,
    }
  }

  return {
    userId: null,
    guestId: actor.guestId === "guest_unavailable" ? null : actor.guestId,
  }
}

function toQuoteValidationErrorMessage(reason: string | null) {
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

function buildCheckoutIdempotencyKey(input: {
  partialOfferRequestId: string
  quoteId: string
  offerId: string
  paymentMode: "pay_now" | "hold"
  selectedPartialOffers: string[]
  passengers: unknown
  services: unknown
  metadata: Record<string, string>
  netTotal: number
  sellTotal: number
}) {
  const payload = JSON.stringify({
    partialOfferRequestId: input.partialOfferRequestId,
    quoteId: input.quoteId,
    offerId: input.offerId,
    paymentMode: input.paymentMode,
    selectedPartialOffers: input.selectedPartialOffers,
    passengers: input.passengers,
    services: input.services,
    metadata: input.metadata,
    netTotal: input.netTotal,
    sellTotal: input.sellTotal,
  })

  return createHash("sha256").update(payload).digest("hex")
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

function toNumeric(value: string) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function roundToCurrency(value: number, currency: string) {
  const digits = currencyMinorUnit(currency.trim().toUpperCase())
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function toAmountString(value: number, currency: string) {
  const rounded = roundToCurrency(value, currency)
  const digits = currencyMinorUnit(currency.trim().toUpperCase())
  return rounded.toFixed(digits)
}
