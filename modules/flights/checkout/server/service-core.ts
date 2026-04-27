import "server-only"

import { format } from "date-fns"
import type { CreateOrder, Offer, Order, SeatMap } from "@duffel/api/types"
import { z } from "zod"

import type { ActorContext } from "@/modules/auth/types"
import { toNumeric } from "@/lib/shared/number"
import {
  buildCheckoutPageModel,
  computeAncillaryPricing,
  mapPassengersToCreateOrderPassengers,
  normalizeAncillarySelection,
  normalizeMetadataPairs,
  validateIdentityDocumentRequirements,
  type CheckoutPageData,
  type CheckoutSessionStatusResult,
  type CheckoutSubmitInput,
  type CheckoutPaymentStartResult,
  type CheckoutUrlState,
} from "@/modules/flights/checkout/domain"
import { getCheckoutServerConfig } from "@/modules/flights/checkout/server/config"
import {
  defaultFlightOrderRepository,
  type FlightOrderRepository,
} from "@/modules/flights/checkout/server/order-repository"
import {
  defaultPaymentWebhookEventRepository,
  type PaymentWebhookEventRepository,
} from "@/modules/flights/checkout/server/payment-webhook-event-repository"
import {
  incrementCheckoutMetric,
} from "@/modules/flights/checkout/server/metrics"
import {
  defaultCheckoutSessionRepository,
  type CheckoutSessionRepository,
} from "@/modules/flights/checkout/server/session-repository"
import {
  buildCheckoutIdempotencyKey,
  createCheckoutSessionId,
  createFlightOrderId,
  createTerminalCheckoutSnapshot,
  createWebhookEventId,
  doesSessionOwnerMatch,
  isPaymentAmountMatch,
  parseOptionalDate,
  roundToCurrency,
  statusToMessage,
  toAmountString,
  toPayHereEventKey,
  toPayNowUnavailableReason,
  toQuoteOwner,
  toQuoteValidationErrorMessage,
} from "@/modules/flights/checkout/server/service-helpers"
import {
  convertToLkr,
  getPayHereConfig,
  mapPayHereStatusCode,
  toPayHereAmount,
  verifyPayHereNotifySignature,
  createPayHereRequestHash,
  type PayHereNotifyPayload,
  type PayHereStartPaymentPayload,
} from "@/modules/flights/payments/payhere"
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
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"

interface FetchCheckoutPageDataInput {
  partialOfferRequestId: string
  state: CheckoutUrlState
  actor: ActorContext
}

interface StartCheckoutPaymentInput {
  actor: ActorContext
  payload: CheckoutSubmitInput
}

interface SubmitCheckoutInput {
  actor: ActorContext
  payload: CheckoutSubmitInput
}

interface ProcessPayHereNotificationInput {
  payload: PayHereNotifyPayload
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
  sessionRepository: CheckoutSessionRepository
  orderRepository: FlightOrderRepository
  paymentWebhookEventRepository: PaymentWebhookEventRepository
}

interface CheckoutQuoteViewSource {
  id: string
  currency: string
  netAmount: number
  sellAmount: number
  expiresAt: Date
}

interface CheckoutStatusSessionViewSource extends CheckoutQuoteViewSource {
  offerId: string
  selectedPartialOffers: string[]
}

const checkoutPayloadSnapshotSchema = z.object({
  partialOfferRequestId: z.string().min(1),
  offerId: z.string().min(1),
  quoteId: z.string().min(1),
  selectedPartialOffers: z.array(z.string().min(1)).min(1),
  contact: z.object({
    email: z.email(),
    phoneNumber: z.string().min(1),
  }),
  billing: z.object({
    address: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
  }),
  passengers: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum(["adult", "child", "infant_without_seat"]),
      title: z.enum(["mr", "mrs", "ms", "miss", "dr"]),
      givenName: z.string().min(1),
      familyName: z.string().min(1),
      bornOn: z.string().min(1),
      gender: z.enum(["m", "f"]),
      email: z.string().optional(),
      phoneNumber: z.string().optional(),
      identityDocument: z
        .object({
          type: z.enum(["passport", "tax_id"]),
          uniqueIdentifier: z.string().min(1),
          issuingCountryCode: z.string().min(2).max(2),
          expiresOn: z.string().min(1),
        })
        .nullable()
        .optional(),
    })
  ),
  metadata: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
  ancillarySelection: z
    .object({
      services: z.array(
        z.object({
          id: z.string().min(1),
          quantity: z.number().int().positive(),
        })
      ),
      metadata: z.any().nullable().optional(),
    })
    .nullable()
    .optional(),
  netTotal: z.number(),
  sourceCurrency: z.string().min(1),
})

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
  sessionRepository: defaultCheckoutSessionRepository,
  orderRepository: defaultFlightOrderRepository,
  paymentWebhookEventRepository: defaultPaymentWebhookEventRepository,
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

  let quoteForView: CheckoutQuoteViewSource | null =
    quoteValidation.ok && quoteValidation.quote
      ? toCheckoutQuoteViewSource(quoteValidation.quote)
      : null

  const statusSessionSource =
    input.state.status && input.state.sessionId
      ? await resolveQuoteFromSessionForStatusMode({
          input,
          deps,
        })
      : null

  if (!quoteForView && statusSessionSource) {
    quoteForView = {
      id: statusSessionSource.id,
      currency: statusSessionSource.currency,
      netAmount: statusSessionSource.netAmount,
      sellAmount: statusSessionSource.sellAmount,
      expiresAt: statusSessionSource.expiresAt,
    }
    logFlightFlow("fetchCheckoutPageData", "quote_fallback_from_session", {
      partialOfferRequestId: input.partialOfferRequestId,
      offerId: statusSessionSource.offerId,
      quoteId: statusSessionSource.id,
      checkoutSessionId: input.state.sessionId,
      status: input.state.status,
    })
  }

  if (!quoteForView) {
    throw new Error(toQuoteValidationErrorMessage(quoteValidation.reason))
  }

  const effectiveOfferId = statusSessionSource?.offerId ?? input.state.offerId
  const effectiveSelectedPartialOffers =
    statusSessionSource?.selectedPartialOffers ?? input.state.selectedPartialOffers

  const offer = await deps.getOfferById(effectiveOfferId)
  const seatMaps = await deps.getSeatMapsByOfferId(effectiveOfferId)
  const logos = await getAirlineLogosByAirlineId([offer.owner.id])

  const model = buildCheckoutPageModel({
    partialOfferRequestId: input.partialOfferRequestId,
    state: {
      ...input.state,
      offerId: effectiveOfferId,
      selectedPartialOffers: effectiveSelectedPartialOffers,
    },
    offer,
    seatMaps,
    quote: {
      id: quoteForView.id,
      currency: quoteForView.currency,
      netAmount: quoteForView.netAmount,
      sellAmount: quoteForView.sellAmount,
      expiresAt: quoteForView.expiresAt,
    },
    airlineLogosByAirlineId: logos,
  })

  const payHerePreview = buildPayHerePreview({
    fareNetAmount: quoteForView.netAmount,
    sourceCurrency: quoteForView.currency,
  })

  model.payHere = payHerePreview

  logFlightFlow("fetchCheckoutPageData", "completed", {
    partialOfferRequestId: input.partialOfferRequestId,
    offerId: effectiveOfferId,
    seatMapCount: seatMaps.length,
    passengerCount: model.passengerDefaults.length,
    payNowEnabled: model.payHere.payNowEnabled,
  })

  return model
}

async function resolveQuoteFromSessionForStatusMode(input: {
  input: FetchCheckoutPageDataInput
  deps: CheckoutServiceDeps
}): Promise<CheckoutStatusSessionViewSource | null> {
  const checkoutSessionId = input.input.state.sessionId

  if (!checkoutSessionId) {
    return null
  }

  const session = await input.deps.sessionRepository.findById(checkoutSessionId)

  if (!session) {
    return null
  }

  if (!doesSessionOwnerMatch(session, input.input.actor)) {
    return null
  }

  if (session.partialOfferRequestId !== input.input.partialOfferRequestId) {
    return null
  }

  return {
    id: session.quoteId,
    offerId: session.offerId,
    selectedPartialOffers: session.selectedPartialOffers,
    currency: session.currency,
    netAmount: session.netAmount,
    sellAmount: session.sellAmount,
    expiresAt: session.expiresAt,
  }
}

export async function startCheckoutPayment(
  input: StartCheckoutPaymentInput,
  deps: CheckoutServiceDeps = defaultDeps
): Promise<CheckoutPaymentStartResult> {
  if (input.payload.paymentMode !== "pay_now") {
    throw new Error("Invalid payment mode for PayHere payment start.")
  }

  if (!input.payload.billing) {
    throw new Error("Billing details are required for pay now.")
  }

  const now = deps.now()
  const prepared = await prepareCheckoutForSubmission({
    actor: input.actor,
    payload: input.payload,
    deps,
    now,
  })

  const payHerePreview = buildPayHerePreview({
    fareNetAmount: prepared.netTotal,
    sourceCurrency: prepared.quote.currency,
  })

  if (!payHerePreview.payNowEnabled) {
    throw new Error(
      payHerePreview.unavailableReason ??
        "Pay now is unavailable for this fare. Please choose hold."
    )
  }

  const idempotencyKey = buildCheckoutIdempotencyKey({
    partialOfferRequestId: input.payload.partialOfferRequestId,
    quoteId: input.payload.quoteId,
    offerId: input.payload.offerId,
    paymentMode: input.payload.paymentMode,
    owner: prepared.owner,
    selectedPartialOffers: input.payload.selectedPartialOffers,
    passengers: prepared.passengers,
    services: prepared.ancillarySelection.services,
    metadata: prepared.metadata,
    netTotal: prepared.netTotal,
    sellTotal: prepared.sellTotal,
    billing: input.payload.billing,
  })

  const existingSession = await deps.sessionRepository.findByIdempotencyKey(idempotencyKey)

  if (existingSession) {
    if (existingSession.status === "completed") {
      throw new Error("Checkout is already completed for this payment request.")
    }

    if (existingSession.status === "payment_authorized") {
      throw new Error("Payment already received. Waiting for booking confirmation.")
    }

    if (existingSession.status === "processing") {
      if (!existingSession.providerOrderId || existingSession.paymentAmount === null) {
        throw new Error("Checkout payment state is incomplete. Please retry checkout.")
      }

      const paymentPayload = buildPayHereStartPayload({
        checkoutSessionId: existingSession.id,
        partialOfferRequestId: input.payload.partialOfferRequestId,
        offerId: input.payload.offerId,
        quoteId: input.payload.quoteId,
        contact: input.payload.contact,
        billing: input.payload.billing,
        amountLkr: existingSession.paymentAmount,
      })

      return {
        checkoutSessionId: existingSession.id,
        payment: paymentPayload,
        chargeAmount: existingSession.paymentAmount,
        chargeCurrency: "LKR",
        chargeAmountLabel: formatCurrencyAmount(existingSession.paymentAmount, "LKR"),
        status: "processing",
      }
    }

    if (existingSession.errorMessage) {
      throw new Error(existingSession.errorMessage)
    }
  }

  const checkoutSessionId = createCheckoutSessionId()
  const paymentPayload = buildPayHereStartPayload({
    checkoutSessionId,
    partialOfferRequestId: input.payload.partialOfferRequestId,
    offerId: input.payload.offerId,
    quoteId: input.payload.quoteId,
    contact: input.payload.contact,
    billing: input.payload.billing,
    amountLkr: payHerePreview.estimatedFareAmountLkr ?? 0,
  })

  await deps.sessionRepository.create({
    id: checkoutSessionId,
    idempotencyKey,
    partialOfferRequestId: input.payload.partialOfferRequestId,
    quoteId: input.payload.quoteId,
    offerId: input.payload.offerId,
    selectedPartialOffers: input.payload.selectedPartialOffers,
    ownerUserId: prepared.owner.userId,
    ownerGuestId: prepared.owner.guestId,
    ownerOrgId: null,
    paymentMode: "pay_now",
    currency: prepared.quote.currency,
    netAmount: prepared.netTotal,
    sellAmount: prepared.sellTotal,
    paymentProvider: "payhere",
    providerOrderId: checkoutSessionId,
    providerPaymentId: null,
    providerStatusCode: null,
    providerStatusMessage: null,
    paymentCurrency: "LKR",
    paymentAmount: payHerePreview.estimatedFareAmountLkr ?? null,
    fxSourceCurrency: payHerePreview.fxSourceCurrency,
    fxTargetCurrency: payHerePreview.fxTargetCurrency,
    fxBaseRate: payHerePreview.fxBaseRate,
    fxBufferPercent: payHerePreview.fxBufferPercent,
    fxEffectiveRate: payHerePreview.fxEffectiveRate,
    checkoutPayloadSnapshot: {
      partialOfferRequestId: input.payload.partialOfferRequestId,
      offerId: input.payload.offerId,
      quoteId: input.payload.quoteId,
      selectedPartialOffers: input.payload.selectedPartialOffers,
      contact: input.payload.contact,
      billing: input.payload.billing,
      passengers: input.payload.passengers,
      metadata: input.payload.metadata,
      ancillarySelection: prepared.ancillarySelection,
      netTotal: prepared.netTotal,
      sourceCurrency: prepared.quote.currency,
    },
    status: "processing",
    paymentInitiatedAt: now,
    paymentConfirmedAt: null,
    finalizedAt: null,
    expiresAt: new Date(now.getTime() + getCheckoutServerConfig().checkoutSessionTtlMinutes * 60_000),
  })

  incrementCheckoutMetric("checkout_started", {
    checkoutSessionId,
    paymentMode: "pay_now",
  })
  incrementCheckoutMetric("payhere_start_total", {
    checkoutSessionId,
  })

  logFlightFlow("checkout.payhere", "payment_started", {
    checkoutSessionId,
    partialOfferRequestId: input.payload.partialOfferRequestId,
    offerId: input.payload.offerId,
    chargeAmount: payHerePreview.estimatedFareAmountLkr,
    chargeCurrency: "LKR",
  })

  return {
    checkoutSessionId,
    payment: paymentPayload,
    chargeAmount: payHerePreview.estimatedFareAmountLkr ?? 0,
    chargeCurrency: "LKR",
    chargeAmountLabel: payHerePreview.estimatedFareAmountLkrLabel ?? formatCurrencyAmount(0, "LKR"),
    status: "processing",
  }
}

export async function submitCheckout(
  input: SubmitCheckoutInput,
  deps: CheckoutServiceDeps = defaultDeps
): Promise<CheckoutSubmissionSuccess> {
  if (input.payload.paymentMode !== "hold") {
    throw new Error("Pay now uses PayHere async flow. Please retry with pay now.")
  }

  const now = deps.now()
  const prepared = await prepareCheckoutForSubmission({
    actor: input.actor,
    payload: input.payload,
    deps,
    now,
  })

  if (prepared.ancillarySelection.services.length > 0) {
    throw new Error("Seats and extra baggage are only available with Pay now.")
  }

  if (prepared.offer.payment_requirements.requires_instant_payment) {
    throw new Error("This offer requires instant payment and cannot be held.")
  }

  const idempotencyKey = buildCheckoutIdempotencyKey({
    partialOfferRequestId: input.payload.partialOfferRequestId,
    quoteId: input.payload.quoteId,
    offerId: input.payload.offerId,
    paymentMode: input.payload.paymentMode,
    owner: prepared.owner,
    selectedPartialOffers: input.payload.selectedPartialOffers,
    passengers: prepared.passengers,
    services: prepared.ancillarySelection.services,
    metadata: prepared.metadata,
    netTotal: prepared.netTotal,
    sellTotal: prepared.sellTotal,
    billing: input.payload.billing,
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

    if (existingSession.status === "processing" || existingSession.status === "payment_authorized") {
      throw new Error("Checkout is already processing. Please wait a moment.")
    }
  }

  const session = await deps.sessionRepository.create({
    id: createCheckoutSessionId(),
    idempotencyKey,
    partialOfferRequestId: input.payload.partialOfferRequestId,
    quoteId: input.payload.quoteId,
    offerId: input.payload.offerId,
    selectedPartialOffers: input.payload.selectedPartialOffers,
    ownerUserId: prepared.owner.userId,
    ownerGuestId: prepared.owner.guestId,
    ownerOrgId: null,
    paymentMode: "hold",
    currency: prepared.quote.currency,
    netAmount: prepared.netTotal,
    sellAmount: prepared.sellTotal,
    paymentProvider: null,
    providerOrderId: null,
    providerPaymentId: null,
    providerStatusCode: null,
    providerStatusMessage: null,
    paymentCurrency: null,
    paymentAmount: null,
    fxSourceCurrency: null,
    fxTargetCurrency: null,
    fxBaseRate: null,
    fxBufferPercent: null,
    fxEffectiveRate: null,
    checkoutPayloadSnapshot: createTerminalCheckoutSnapshot({
      partialOfferRequestId: input.payload.partialOfferRequestId,
      offerId: input.payload.offerId,
      quoteId: input.payload.quoteId,
      selectedPartialOffers: input.payload.selectedPartialOffers,
      paymentMode: "hold",
      sourceCurrency: prepared.quote.currency,
      netTotal: prepared.netTotal,
      sellTotal: prepared.sellTotal,
      ancillaryServicesCount: prepared.ancillarySelection.services.length,
      metadataKeys: Object.keys(prepared.metadata),
    }),
    status: "processing",
    paymentInitiatedAt: null,
    paymentConfirmedAt: null,
    finalizedAt: null,
    expiresAt: new Date(now.getTime() + getCheckoutServerConfig().checkoutSessionTtlMinutes * 60_000),
  })

  incrementCheckoutMetric("checkout_started", {
    checkoutSessionId: session.id,
    paymentMode: "hold",
  })

  try {
    const orderPayload: CreateOrder = {
      selected_offers: [prepared.offer.id],
      passengers: prepared.passengers,
      type: "pay_later",
      metadata: prepared.metadata,
    }

    const duffelOrder = await deps.createOrder(orderPayload)
    incrementCheckoutMetric("order_created", {
      checkoutSessionId: session.id,
      duffelOrderId: duffelOrder.id,
    })

    const flightOrder = await deps.orderRepository.create({
      id: createFlightOrderId(),
      checkoutSessionId: session.id,
      duffelOrderId: duffelOrder.id,
      partialOfferRequestId: input.payload.partialOfferRequestId,
      offerId: input.payload.offerId,
      selectedPartialOffers: input.payload.selectedPartialOffers,
      ownerUserId: prepared.owner.userId,
      ownerGuestId: prepared.owner.guestId,
      ownerOrgId: null,
      paymentMode: "hold",
      settlementType: getCheckoutServerConfig().settlementPaymentType,
      currency: prepared.quote.currency,
      netAmount: prepared.netTotal,
      sellAmount: prepared.sellTotal,
      duffelTotalAmount: toNumeric(duffelOrder.total_amount),
      duffelTotalCurrency: duffelOrder.total_currency,
      paymentAwaiting: duffelOrder.payment_status.awaiting_payment,
      paymentRequiredBy: parseOptionalDate(duffelOrder.payment_status.payment_required_by),
      priceGuaranteeExpiresAt: parseOptionalDate(
        duffelOrder.payment_status.price_guarantee_expires_at
      ),
      paidAt: parseOptionalDate(duffelOrder.payment_status.paid_at),
    })

    await markPricedQuoteConsumed(prepared.quote.id)
    incrementCheckoutMetric("quote_consumed", {
      checkoutSessionId: session.id,
      quoteId: prepared.quote.id,
    })

    await deps.sessionRepository.update(session.id, {
      status: "completed",
      duffelOrderId: duffelOrder.id,
      finalizedAt: now,
      errorCode: null,
      errorMessage: null,
    })

    incrementCheckoutMetric("checkout_submit_success", {
      checkoutSessionId: session.id,
    })

    return {
      checkoutSessionId: session.id,
      flightOrderId: flightOrder.id,
      duffelOrderId: duffelOrder.id,
      paymentMode: "hold",
      totalSellAmountLabel: formatCurrencyAmount(prepared.sellTotal, prepared.quote.currency),
      paymentRequiredByLabel: flightOrder.paymentRequiredBy
        ? format(flightOrder.paymentRequiredBy, "dd/MM/yyyy, HH:mm")
        : null,
    }
  } catch (error) {
    incrementCheckoutMetric("checkout_submit_failed", {
      checkoutSessionId: session.id,
    })
    logFlightFlowError("submitCheckout", "hold_submit_failed", error, {
      checkoutSessionId: session.id,
    })

    await deps.sessionRepository.update(session.id, {
      status: "failed",
      errorCode: "checkout_submit_failed",
      errorMessage: "Checkout could not be completed right now. Please try again.",
    })

    throw error
  }
}

export async function getCheckoutSessionStatus(
  input: { actor: ActorContext; checkoutSessionId: string },
  deps: CheckoutServiceDeps = defaultDeps
): Promise<CheckoutSessionStatusResult> {
  const session = await deps.sessionRepository.findById(input.checkoutSessionId)

  if (!session) {
    throw new Error("Checkout session not found.")
  }

  if (!doesSessionOwnerMatch(session, input.actor)) {
    throw new Error("Checkout session ownership mismatch.")
  }

  if (session.status === "completed") {
    const order = await deps.orderRepository.findByCheckoutSessionId(session.id)

    return {
      checkoutSessionId: session.id,
      status: session.status,
      message: null,
      duffelOrderId: order?.duffelOrderId ?? session.duffelOrderId ?? null,
      totalChargeAmountLabel:
        session.paymentAmount !== null && session.paymentCurrency
          ? formatCurrencyAmount(session.paymentAmount, session.paymentCurrency)
          : order
            ? formatCurrencyAmount(order.sellAmount, order.currency)
            : null,
    }
  }

  return {
    checkoutSessionId: session.id,
    status: session.status,
    message: statusToMessage({
      status: session.status,
      errorCode: session.errorCode,
    }),
    duffelOrderId: session.duffelOrderId,
    totalChargeAmountLabel:
      session.paymentAmount !== null && session.paymentCurrency
        ? formatCurrencyAmount(session.paymentAmount, session.paymentCurrency)
        : null,
  }
}

export async function processPayHereNotification(
  input: ProcessPayHereNotificationInput,
  deps: CheckoutServiceDeps = defaultDeps
) {
  incrementCheckoutMetric("payhere_notify_total")

  const payload = input.payload
  const config = getPayHereConfig()
  const eventKey = toPayHereEventKey({
    orderId: payload.order_id,
    paymentId: payload.payment_id,
    statusCode: payload.status_code,
    amount: payload.payhere_amount,
    currency: payload.payhere_currency,
  })

  if (payload.merchant_id !== config.merchantId) {
    incrementCheckoutMetric("payhere_notify_invalid_sig_total", {
      reason: "merchant_id_mismatch",
    })
    throw new Error("Invalid PayHere merchant ID.")
  }

  if (
    !verifyPayHereNotifySignature({
      merchantSecret: config.merchantSecret,
      payload,
    })
  ) {
    incrementCheckoutMetric("payhere_notify_invalid_sig_total", {
      reason: "signature_mismatch",
    })
    throw new Error("Invalid PayHere signature.")
  }

  const alreadyProcessed = await deps.paymentWebhookEventRepository.isProcessed({
    provider: "payhere",
    eventKey,
  })

  if (alreadyProcessed) {
    logFlightFlow("checkout.payhere", "notify_ignored_duplicate_event", {
      providerOrderId: payload.order_id,
      paymentId: payload.payment_id,
    })
    return
  }

  const session = await deps.sessionRepository.findById(payload.order_id)

  if (!session) {
    await deps.paymentWebhookEventRepository.record({
      id: createWebhookEventId(),
      provider: "payhere",
      eventKey,
      providerOrderId: payload.order_id,
      providerPaymentId: payload.payment_id,
      payload,
    })
    throw new Error("Checkout session not found for PayHere order.")
  }

  await deps.paymentWebhookEventRepository.record({
    id: createWebhookEventId(),
    provider: "payhere",
    eventKey,
    providerOrderId: payload.order_id,
    providerPaymentId: payload.payment_id,
    payload,
  })

  if (session.status === "completed") {
    logFlightFlow("checkout.payhere", "notify_ignored_completed_session", {
      checkoutSessionId: session.id,
      paymentId: payload.payment_id,
    })
    return
  }

  const mappedStatus = mapPayHereStatusCode(payload.status_code)
  const now = deps.now()

  if (mappedStatus !== "success") {
    await deps.sessionRepository.update(session.id, {
      status: mappedStatus === "pending" ? "processing" : "failed",
      providerPaymentId: payload.payment_id,
      providerStatusCode: payload.status_code,
      providerStatusMessage: payload.status_message ?? mappedStatus,
      checkoutPayloadSnapshot:
        mappedStatus === "pending"
          ? session.checkoutPayloadSnapshot
          : createTerminalCheckoutSnapshot({
              partialOfferRequestId: session.partialOfferRequestId,
              offerId: session.offerId,
              quoteId: session.quoteId,
              selectedPartialOffers: session.selectedPartialOffers,
              paymentMode: session.paymentMode,
              sourceCurrency: session.currency,
              netTotal: session.netAmount,
              sellTotal: session.sellAmount,
            }),
      errorCode: mappedStatus === "pending" ? null : "payhere_payment_failed",
      errorMessage:
        mappedStatus === "pending"
          ? null
          : payload.status_message ?? "Payment was not successful.",
    })

    if (mappedStatus !== "pending") {
      incrementCheckoutMetric("checkout_payment_failed_total", {
        checkoutSessionId: session.id,
        statusCode: payload.status_code,
      })
    }

    return
  }

  if (
    !isPaymentAmountMatch({
      expectedAmount: session.paymentAmount,
      expectedCurrency: session.paymentCurrency,
      actualAmount: payload.payhere_amount,
      actualCurrency: payload.payhere_currency,
    })
  ) {
    await deps.sessionRepository.update(session.id, {
      status: "reconciliation_required",
      providerPaymentId: payload.payment_id,
      providerStatusCode: payload.status_code,
      providerStatusMessage: payload.status_message ?? "amount_mismatch",
      paymentConfirmedAt: now,
      checkoutPayloadSnapshot: createTerminalCheckoutSnapshot({
        partialOfferRequestId: session.partialOfferRequestId,
        offerId: session.offerId,
        quoteId: session.quoteId,
        selectedPartialOffers: session.selectedPartialOffers,
        paymentMode: session.paymentMode,
        sourceCurrency: session.currency,
        netTotal: session.netAmount,
        sellTotal: session.sellAmount,
      }),
      errorCode: "payhere_amount_mismatch",
      errorMessage:
        "Payment amount/currency mismatch detected. Support will reconcile this payment.",
    })
    incrementCheckoutMetric("checkout_reconciliation_required_total", {
      checkoutSessionId: session.id,
      reason: "amount_mismatch",
    })
    return
  }

  await deps.sessionRepository.update(session.id, {
    status: "payment_authorized",
    providerPaymentId: payload.payment_id,
    providerStatusCode: payload.status_code,
    providerStatusMessage: payload.status_message ?? "success",
    paymentConfirmedAt: now,
    errorCode: null,
    errorMessage: null,
  })

  try {
    const snapshotParsed = checkoutPayloadSnapshotSchema.safeParse(
      session.checkoutPayloadSnapshot
    )

    if (!snapshotParsed.success) {
      throw new Error("Stored checkout snapshot is invalid.")
    }

    const snapshot = snapshotParsed.data
    const offer = await deps.getOfferById(snapshot.offerId)
    const ancillarySelection = normalizeAncillarySelection(snapshot.ancillarySelection)

    validateIdentityDocumentRequirements({
      offer,
      passengers: snapshot.passengers,
    })

    const passengers = mapPassengersToCreateOrderPassengers({
      offer,
      passengers: snapshot.passengers,
      contact: snapshot.contact,
    })

    const metadata = normalizeMetadataPairs(snapshot.metadata)
    metadata.checkout_quote_id = snapshot.quoteId
    metadata.checkout_session_origin = "vacatina_checkout_v1"
    metadata.checkout_payment_provider = "payhere"

    const orderPayload: CreateOrder = {
      selected_offers: [offer.id],
      passengers,
      type: "instant",
      metadata,
      payments: [
        {
          type: getCheckoutServerConfig().settlementPaymentType,
          amount: toAmountString(snapshot.netTotal, snapshot.sourceCurrency),
          currency: snapshot.sourceCurrency,
        },
      ],
    }

    if (ancillarySelection.services.length > 0) {
      orderPayload.services = ancillarySelection.services
    }

    const duffelOrder = await deps.createOrder(orderPayload)
    incrementCheckoutMetric("order_created", {
      checkoutSessionId: session.id,
      duffelOrderId: duffelOrder.id,
    })

    await deps.orderRepository.create({
      id: createFlightOrderId(),
      checkoutSessionId: session.id,
      duffelOrderId: duffelOrder.id,
      partialOfferRequestId: snapshot.partialOfferRequestId,
      offerId: snapshot.offerId,
      selectedPartialOffers: snapshot.selectedPartialOffers,
      ownerUserId: session.ownerUserId,
      ownerGuestId: session.ownerGuestId,
      ownerOrgId: session.ownerOrgId,
      paymentMode: "pay_now",
      settlementType: getCheckoutServerConfig().settlementPaymentType,
      currency: snapshot.sourceCurrency,
      netAmount: snapshot.netTotal,
      sellAmount: session.sellAmount,
      duffelTotalAmount: toNumeric(duffelOrder.total_amount),
      duffelTotalCurrency: duffelOrder.total_currency,
      paymentAwaiting: duffelOrder.payment_status.awaiting_payment,
      paymentRequiredBy: parseOptionalDate(duffelOrder.payment_status.payment_required_by),
      priceGuaranteeExpiresAt: parseOptionalDate(
        duffelOrder.payment_status.price_guarantee_expires_at
      ),
      paidAt: parseOptionalDate(duffelOrder.payment_status.paid_at),
    })

    await markPricedQuoteConsumed(snapshot.quoteId)
    incrementCheckoutMetric("quote_consumed", {
      checkoutSessionId: session.id,
      quoteId: snapshot.quoteId,
    })

    await deps.sessionRepository.update(session.id, {
      status: "completed",
      duffelOrderId: duffelOrder.id,
      finalizedAt: now,
      checkoutPayloadSnapshot: createTerminalCheckoutSnapshot({
        partialOfferRequestId: snapshot.partialOfferRequestId,
        offerId: snapshot.offerId,
        quoteId: snapshot.quoteId,
        selectedPartialOffers: snapshot.selectedPartialOffers,
        paymentMode: session.paymentMode,
        sourceCurrency: snapshot.sourceCurrency,
        netTotal: snapshot.netTotal,
        sellTotal: session.sellAmount,
        ancillaryServicesCount: ancillarySelection.services.length,
        metadataKeys: Object.keys(metadata),
      }),
      errorCode: null,
      errorMessage: null,
    })

    incrementCheckoutMetric("checkout_payment_success_total", {
      checkoutSessionId: session.id,
      duffelOrderId: duffelOrder.id,
    })
  } catch (error) {
    logFlightFlowError("checkout.payhere", "finalize_failed", error, {
      checkoutSessionId: session.id,
      providerPaymentId: payload.payment_id,
    })

    await deps.sessionRepository.update(session.id, {
      status: "reconciliation_required",
      checkoutPayloadSnapshot: createTerminalCheckoutSnapshot({
        partialOfferRequestId: session.partialOfferRequestId,
        offerId: session.offerId,
        quoteId: session.quoteId,
        selectedPartialOffers: session.selectedPartialOffers,
        paymentMode: session.paymentMode,
        sourceCurrency: session.currency,
        netTotal: session.netAmount,
        sellTotal: session.sellAmount,
      }),
      errorCode: "payhere_finalize_failed",
      errorMessage:
        "Payment received but booking confirmation is pending manual reconciliation.",
    })
    incrementCheckoutMetric("checkout_reconciliation_required_total", {
      checkoutSessionId: session.id,
      reason: "finalize_failed",
    })
  }
}

async function prepareCheckoutForSubmission(input: {
  actor: ActorContext
  payload: CheckoutSubmitInput
  deps: CheckoutServiceDeps
  now: Date
}) {
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

  const offer = await input.deps.getOfferById(input.payload.offerId)
  const ancillarySelection = normalizeAncillarySelection(input.payload.ancillarySelection)
  const ancillaryPricing = computeAncillaryPricing({
    offer,
    selectedServices: ancillarySelection.services,
    expectedCurrency: quoteValidation.quote.currency,
    markup: {
      ratePercent: getCheckoutServerConfig().ancillaryMarkupRatePercent,
      fixedAmount: getCheckoutServerConfig().ancillaryMarkupFixedAmount,
    },
  })

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

  return {
    owner,
    quote: quoteValidation.quote,
    offer,
    ancillarySelection,
    metadata,
    passengers,
    netTotal,
    sellTotal,
  }
}

function buildPayHerePreview(input: {
  fareNetAmount: number
  sourceCurrency: string
}): CheckoutPageData["payHere"] {
  try {
    const payHereConfig = getPayHereConfig()
    const converted = convertToLkr({
      amount: input.fareNetAmount,
      sourceCurrency: input.sourceCurrency,
      bufferPercent: payHereConfig.fxBufferPercent,
    })
    const calculatedChargeAmount = roundToCurrency(
      converted.convertedAmount * (1 + payHereConfig.markupRatePercent / 100) +
        payHereConfig.markupFixedLkr,
      "LKR"
    )
    const chargeAmount = payHereConfig.testFixedAmountLkr ?? calculatedChargeAmount

    return {
      payNowEnabled: true,
      unavailableReason: null,
      chargeCurrency: "LKR",
      estimatedFareAmountLkr: chargeAmount,
      estimatedFareAmountLkrLabel: formatCurrencyAmount(chargeAmount, "LKR"),
      fxSourceCurrency: converted.sourceCurrency,
      fxTargetCurrency: converted.targetCurrency,
      fxBaseRate: converted.baseRate,
      fxBufferPercent: converted.bufferPercent,
      fxEffectiveRate: converted.effectiveRate,
      scriptUrl: payHereConfig.scriptUrl,
    }
  } catch (error) {
    return {
      payNowEnabled: false,
      unavailableReason: toPayNowUnavailableReason(error),
      chargeCurrency: "LKR",
      estimatedFareAmountLkr: null,
      estimatedFareAmountLkrLabel: null,
      fxSourceCurrency: input.sourceCurrency,
      fxTargetCurrency: "LKR",
      fxBaseRate: null,
      fxBufferPercent: 3,
      fxEffectiveRate: null,
      scriptUrl: "https://www.payhere.lk/lib/payhere.js",
    }
  }
}

function buildPayHereStartPayload(input: {
  checkoutSessionId: string
  partialOfferRequestId: string
  offerId: string
  quoteId: string
  contact: CheckoutSubmitInput["contact"]
  billing: NonNullable<CheckoutSubmitInput["billing"]>
  amountLkr: number
}): PayHereStartPaymentPayload {
  const config = getPayHereConfig()
  const amount = toPayHereAmount(input.amountLkr)
  const hash = createPayHereRequestHash({
    merchantId: config.merchantId,
    merchantSecret: config.merchantSecret,
    orderId: input.checkoutSessionId,
    amount,
    currency: "LKR",
  })

  const [firstName, ...rest] = deriveNameFromEmail(input.contact.email)

  return {
    sandbox: config.sandbox,
    merchant_id: config.merchantId,
    return_url: config.returnUrl,
    cancel_url: config.cancelUrl,
    notify_url: config.notifyUrl,
    order_id: input.checkoutSessionId,
    items: `Flight booking ${input.partialOfferRequestId}`,
    amount,
    currency: "LKR",
    first_name: firstName,
    last_name: rest.join(" ") || "Customer",
    email: input.contact.email,
    phone: input.contact.phoneNumber,
    address: input.billing.address,
    city: input.billing.city,
    country: input.billing.country,
    custom_1: input.quoteId,
    custom_2: input.offerId,
    hash,
  }
}

function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "customer"
  const words = localPart
    .split(/[._-]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))

  if (words.length === 0) {
    return ["Customer"]
  }

  return words
}

function toCheckoutQuoteViewSource(quote: {
  id: string
  currency: string
  netAmount: number
  sellAmount: number
  expiresAt: Date
}) {
  return {
    id: quote.id,
    currency: quote.currency,
    netAmount: quote.netAmount,
    sellAmount: quote.sellAmount,
    expiresAt: quote.expiresAt,
  }
}
