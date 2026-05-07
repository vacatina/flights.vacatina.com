import "server-only"

import { format } from "date-fns"
import type { CreateOrder, Offer, Order, SeatMap } from "@duffel/api/types"
import type Stripe from "stripe"
import { z } from "zod"

import type { ActorContext } from "@/modules/auth/types"
import { toNumeric } from "@/lib/shared/number"
import { getStripeClient, getStripeConfig, toStripeAmountMinorUnit } from "@/lib/stripe"
import {
  buildCheckoutPageModel,
  computeAncillaryPricing,
  mapPassengersToCreateOrderPassengers,
  normalizeAncillarySelection,
  normalizeMetadataPairs,
  toCheckoutUrlSearchParams,
  validateIdentityDocumentRequirements,
  type CheckoutPageData,
  type CheckoutPaymentStartResult,
  type CheckoutSessionStatusResult,
  type CheckoutSubmitInput,
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
  toPayNowUnavailableReason,
  toQuoteOwner,
  toQuoteValidationErrorMessage,
  toStripeEventKey,
} from "@/modules/flights/checkout/server/service-helpers"
import { buildFlightOrderSnapshot } from "@/modules/flights/orders/domain"
import {
  createBookingReference,
  createEmailHash,
} from "@/modules/flights/orders/server/identity"
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
import { enqueueNotification, dispatchPendingNotifications } from "@/modules/notifications/server"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"
import { isStripeCheckoutSession } from "@/modules/flights/checkout/server/stripe-event"

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

interface ProcessStripeWebhookEventInput {
  event: Stripe.Event
}

interface CheckoutSubmissionSuccess {
  checkoutSessionId: string
  flightOrderId: string
  duffelOrderId: string
  bookingReference: string
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

  const paymentPreview = buildStripePaymentPreview({
    fareSellAmount: quoteForView.sellAmount,
    sourceCurrency: quoteForView.currency,
  })

  model.payment = paymentPreview

  logFlightFlow("fetchCheckoutPageData", "completed", {
    partialOfferRequestId: input.partialOfferRequestId,
    offerId: effectiveOfferId,
    seatMapCount: seatMaps.length,
    passengerCount: model.passengerDefaults.length,
    payNowEnabled: model.payment.payNowEnabled,
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
    throw new Error("Invalid payment mode for Stripe payment start.")
  }

  const now = deps.now()
  const prepared = await prepareCheckoutForSubmission({
    actor: input.actor,
    payload: input.payload,
    deps,
    now,
  })

  const paymentPreview = buildStripePaymentPreview({
    fareSellAmount: prepared.sellTotal,
    sourceCurrency: prepared.quote.currency,
  })

  if (!paymentPreview.payNowEnabled) {
    throw new Error(
      paymentPreview.unavailableReason ??
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
  })

  const existingSession = await deps.sessionRepository.findByIdempotencyKey(idempotencyKey)
  const isRetryableExpiredSession =
    existingSession?.status === "failed" &&
    existingSession.errorCode === "stripe_checkout_expired"

  if (existingSession) {
    if (existingSession.status === "completed") {
      throw new Error("Checkout is already completed for this payment request.")
    }

    if (existingSession.status === "payment_authorized") {
      throw new Error("Payment already received. Waiting for booking confirmation.")
    }

    if (existingSession.status === "processing" || isRetryableExpiredSession) {
      if (!existingSession.providerOrderId || existingSession.paymentAmount === null) {
        throw new Error("Checkout payment state is incomplete. Please retry checkout.")
      }

      const stripe = getStripeClient()
      const existingProviderSession = await stripe.checkout.sessions.retrieve(
        existingSession.providerOrderId
      )

      if (existingProviderSession.status === "open" && existingProviderSession.url) {
        return {
          checkoutSessionId: existingSession.id,
          redirectUrl: existingProviderSession.url,
          chargeAmount: existingSession.paymentAmount,
          chargeCurrency: existingSession.paymentCurrency ?? existingSession.currency,
          chargeAmountLabel: formatCurrencyAmount(
            existingSession.paymentAmount,
            existingSession.paymentCurrency ?? existingSession.currency
          ),
          status: "processing",
        }
      }

      if (existingProviderSession.status === "complete") {
        throw new Error("Payment already received. Waiting for booking confirmation.")
      }

      if (existingProviderSession.status !== "expired") {
        throw new Error("Checkout payment state is incomplete. Please retry checkout.")
      }

      const refreshedProviderSession = await createStripeCheckoutSession({
        checkoutSessionId: existingSession.id,
        partialOfferRequestId: input.payload.partialOfferRequestId,
        offerId: input.payload.offerId,
        quoteId: input.payload.quoteId,
        selectedPartialOffers: input.payload.selectedPartialOffers,
        chargeAmount: existingSession.paymentAmount,
        chargeCurrency: existingSession.paymentCurrency ?? existingSession.currency,
        contact: input.payload.contact,
      })

      await deps.sessionRepository.update(existingSession.id, {
        status: "processing",
        providerOrderId: refreshedProviderSession.id,
        providerStatusCode: refreshedProviderSession.status ?? "open",
        providerStatusMessage: refreshedProviderSession.payment_status ?? "unpaid",
        paymentInitiatedAt: now,
        checkoutPayloadSnapshot: replaceCheckoutSnapshotContact(
          existingSession.checkoutPayloadSnapshot,
          input.payload.contact
        ),
        errorCode: null,
        errorMessage: null,
      })

      return {
        checkoutSessionId: existingSession.id,
        redirectUrl: refreshedProviderSession.url ?? "",
        chargeAmount: existingSession.paymentAmount,
        chargeCurrency: existingSession.paymentCurrency ?? existingSession.currency,
        chargeAmountLabel: formatCurrencyAmount(
          existingSession.paymentAmount,
          existingSession.paymentCurrency ?? existingSession.currency
        ),
        status: "processing",
      }
    }

    if (existingSession.errorMessage) {
      throw new Error(existingSession.errorMessage)
    }
  }

  const checkoutSessionId = createCheckoutSessionId()
  const stripeCheckoutSession = await createStripeCheckoutSession({
    checkoutSessionId,
    partialOfferRequestId: input.payload.partialOfferRequestId,
    offerId: input.payload.offerId,
    quoteId: input.payload.quoteId,
    selectedPartialOffers: input.payload.selectedPartialOffers,
    contact: input.payload.contact,
    chargeAmount: paymentPreview.chargeAmount ?? 0,
    chargeCurrency: paymentPreview.chargeCurrency,
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
    paymentProvider: "stripe",
    providerOrderId: stripeCheckoutSession.id,
    providerPaymentId: null,
    providerStatusCode: stripeCheckoutSession.status ?? "open",
    providerStatusMessage: stripeCheckoutSession.payment_status ?? "unpaid",
    paymentCurrency: paymentPreview.chargeCurrency,
    paymentAmount: paymentPreview.chargeAmount ?? null,
    checkoutPayloadSnapshot: {
      partialOfferRequestId: input.payload.partialOfferRequestId,
      offerId: input.payload.offerId,
      quoteId: input.payload.quoteId,
      selectedPartialOffers: input.payload.selectedPartialOffers,
      contact: input.payload.contact,
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
  incrementCheckoutMetric("stripe_start_total", {
    checkoutSessionId,
  })

  logFlightFlow("checkout.stripe", "payment_started", {
    checkoutSessionId,
    partialOfferRequestId: input.payload.partialOfferRequestId,
    offerId: input.payload.offerId,
    providerOrderId: stripeCheckoutSession.id,
    chargeAmount: paymentPreview.chargeAmount,
    chargeCurrency: paymentPreview.chargeCurrency,
  })

  return {
    checkoutSessionId,
    redirectUrl: stripeCheckoutSession.url ?? "",
    chargeAmount: paymentPreview.chargeAmount ?? 0,
    chargeCurrency: paymentPreview.chargeCurrency,
    chargeAmountLabel:
      paymentPreview.chargeAmountLabel ??
      formatCurrencyAmount(0, paymentPreview.chargeCurrency),
    status: "processing",
  }
}

export async function submitCheckout(
  input: SubmitCheckoutInput,
  deps: CheckoutServiceDeps = defaultDeps
): Promise<CheckoutSubmissionSuccess> {
  if (input.payload.paymentMode !== "hold") {
    throw new Error("Pay now uses Stripe checkout flow. Please retry with pay now.")
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
          bookingReference: existingOrder.bookingReference,
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

    const flightOrder = await createFlightOrderWithReference(
      {
        id: createFlightOrderId(),
        checkoutSessionId: session.id,
        duffelOrderId: duffelOrder.id,
        partialOfferRequestId: input.payload.partialOfferRequestId,
        offerId: input.payload.offerId,
        selectedPartialOffers: input.payload.selectedPartialOffers,
        ownerUserId: prepared.owner.userId,
        ownerGuestId: prepared.owner.guestId,
        ownerOrgId: null,
        contactEmail: input.payload.contact.email,
        contactEmailHash: createEmailHash(input.payload.contact.email),
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
        orderSnapshot: buildFlightOrderSnapshot({
          offer: prepared.offer,
          order: duffelOrder,
          paymentMode: "hold",
          currency: prepared.quote.currency,
          sellAmount: prepared.sellTotal,
          contact: input.payload.contact,
          travelers: input.payload.passengers.map((passenger) => ({
            id: passenger.id,
            type: passenger.type,
            title: passenger.title,
            givenName: passenger.givenName,
            familyName: passenger.familyName,
            bornOn: passenger.bornOn,
            gender: passenger.gender,
            email: passenger.email,
            phoneNumber: passenger.phoneNumber,
          })),
          now,
        }),
      },
      deps.orderRepository
    )

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

    await tryDispatchOrderNotification({
      eventType: "hold_created",
      flightOrder,
      checkoutSessionId: session.id,
      statusLabel: "On hold",
    })

    return {
      checkoutSessionId: session.id,
      flightOrderId: flightOrder.id,
      duffelOrderId: duffelOrder.id,
      bookingReference: flightOrder.bookingReference,
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
      bookingReference: order?.bookingReference ?? null,
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
    bookingReference: null,
    totalChargeAmountLabel:
      session.paymentAmount !== null && session.paymentCurrency
        ? formatCurrencyAmount(session.paymentAmount, session.paymentCurrency)
        : null,
  }
}

export async function processStripeWebhookEvent(
  input: ProcessStripeWebhookEventInput,
  deps: CheckoutServiceDeps = defaultDeps
) {
  incrementCheckoutMetric("stripe_webhook_total")

  if (!isStripeCheckoutSession(input.event.data.object)) {
    return
  }

  const stripeSession = input.event.data.object
  const eventKey = toStripeEventKey(input.event.id)

  const alreadyProcessed = await deps.paymentWebhookEventRepository.isProcessed({
    provider: "stripe",
    eventKey,
  })

  if (alreadyProcessed) {
    logFlightFlow("checkout.stripe", "webhook_ignored_duplicate_event", {
      providerOrderId: stripeSession.id,
      eventType: input.event.type,
    })
    return
  }

  const session = await resolveCheckoutSessionFromStripeSession(stripeSession, deps)

  await deps.paymentWebhookEventRepository.record({
    id: createWebhookEventId(),
    provider: "stripe",
    eventKey,
    providerOrderId: stripeSession.id,
    providerPaymentId:
      typeof stripeSession.payment_intent === "string" ? stripeSession.payment_intent : null,
    payload: input.event,
  })

  if (!session) {
    throw new Error("Checkout session not found for Stripe session.")
  }

  if (input.event.type === "checkout.session.expired") {
    if (session.status === "completed" || session.providerOrderId !== stripeSession.id) {
      return
    }

    await deps.sessionRepository.update(session.id, {
      status: "failed",
      providerStatusCode: stripeSession.status ?? "expired",
      providerStatusMessage: stripeSession.payment_status ?? "unpaid",
      errorCode: "stripe_checkout_expired",
      errorMessage: "Stripe checkout session expired before payment was completed.",
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
    })
    incrementCheckoutMetric("checkout_payment_failed_total", {
      checkoutSessionId: session.id,
      statusCode: stripeSession.status ?? "expired",
    })
    return
  }

  if (input.event.type !== "checkout.session.completed") {
    return
  }

  if (session.status === "completed") {
    logFlightFlow("checkout.stripe", "webhook_ignored_completed_session", {
      checkoutSessionId: session.id,
      providerOrderId: stripeSession.id,
    })
    return
  }

  const now = deps.now()
  const paymentIntentId =
    typeof stripeSession.payment_intent === "string" ? stripeSession.payment_intent : null

  if (stripeSession.payment_status !== "paid") {
    await deps.sessionRepository.update(session.id, {
      status: "failed",
      providerPaymentId: paymentIntentId,
      providerStatusCode: stripeSession.status ?? "complete",
      providerStatusMessage: stripeSession.payment_status ?? "unpaid",
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
      errorCode: "stripe_payment_unpaid",
      errorMessage: "Payment was not completed successfully.",
    })
    incrementCheckoutMetric("checkout_payment_failed_total", {
      checkoutSessionId: session.id,
      statusCode: stripeSession.payment_status ?? "unpaid",
    })
    return
  }

  if (
    !isPaymentAmountMatch({
      expectedAmount: session.paymentAmount,
      expectedCurrency: session.paymentCurrency,
      actualAmount: fromStripeAmountMinorUnit(
        stripeSession.amount_total ?? 0,
        stripeSession.currency ?? session.paymentCurrency ?? session.currency
      ),
      actualCurrency: stripeSession.currency ?? session.paymentCurrency ?? session.currency,
    })
  ) {
    await deps.sessionRepository.update(session.id, {
      status: "reconciliation_required",
      providerPaymentId: paymentIntentId,
      providerStatusCode: stripeSession.status ?? "complete",
      providerStatusMessage: stripeSession.payment_status ?? "paid",
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
      errorCode: "stripe_amount_mismatch",
      errorMessage:
        "Payment amount/currency mismatch detected. Support will reconcile this payment.",
    })
    incrementCheckoutMetric("checkout_reconciliation_required_total", {
      checkoutSessionId: session.id,
      reason: "amount_mismatch",
    })
    await queueReconciliationNotificationForSession(session)
    return
  }

  await deps.sessionRepository.update(session.id, {
    status: "payment_authorized",
    providerPaymentId: paymentIntentId,
    providerStatusCode: stripeSession.status ?? "complete",
    providerStatusMessage: stripeSession.payment_status ?? "paid",
    paymentConfirmedAt: now,
    errorCode: null,
    errorMessage: null,
  })

  try {
    await finalizeAuthorizedCheckoutSession({
      session,
      deps,
      now,
      paymentProvider: "stripe",
      providerPaymentId: paymentIntentId,
    })
  } catch (error) {
    logFlightFlowError("checkout.stripe", "finalize_failed", error, {
      checkoutSessionId: session.id,
      providerPaymentId: paymentIntentId,
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
      errorCode: "stripe_finalize_failed",
      errorMessage:
        "Payment received but booking confirmation is pending manual reconciliation.",
    })
    incrementCheckoutMetric("checkout_reconciliation_required_total", {
      checkoutSessionId: session.id,
      reason: "finalize_failed",
    })
    await queueReconciliationNotificationForSession(session)
  }
}

async function finalizeAuthorizedCheckoutSession(input: {
  session: NonNullable<Awaited<ReturnType<CheckoutSessionRepository["findById"]>>>
  deps: CheckoutServiceDeps
  now: Date
  paymentProvider: "stripe"
  providerPaymentId: string | null
}) {
  const snapshotParsed = checkoutPayloadSnapshotSchema.safeParse(
    input.session.checkoutPayloadSnapshot
  )

  if (!snapshotParsed.success) {
    throw new Error("Stored checkout snapshot is invalid.")
  }

  const snapshot = snapshotParsed.data
  const offer = await input.deps.getOfferById(snapshot.offerId)
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
  metadata.checkout_payment_provider = input.paymentProvider

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

  const duffelOrder = await input.deps.createOrder(orderPayload)
  incrementCheckoutMetric("order_created", {
    checkoutSessionId: input.session.id,
    duffelOrderId: duffelOrder.id,
  })

  const flightOrder = await createFlightOrderWithReference(
    {
      id: createFlightOrderId(),
      checkoutSessionId: input.session.id,
      duffelOrderId: duffelOrder.id,
      partialOfferRequestId: snapshot.partialOfferRequestId,
      offerId: snapshot.offerId,
      selectedPartialOffers: snapshot.selectedPartialOffers,
      ownerUserId: input.session.ownerUserId,
      ownerGuestId: input.session.ownerGuestId,
      ownerOrgId: input.session.ownerOrgId,
      contactEmail: snapshot.contact.email,
      contactEmailHash: createEmailHash(snapshot.contact.email),
      paymentMode: "pay_now",
      settlementType: getCheckoutServerConfig().settlementPaymentType,
      currency: snapshot.sourceCurrency,
      netAmount: snapshot.netTotal,
      sellAmount: input.session.sellAmount,
      duffelTotalAmount: toNumeric(duffelOrder.total_amount),
      duffelTotalCurrency: duffelOrder.total_currency,
      paymentAwaiting: duffelOrder.payment_status.awaiting_payment,
      paymentRequiredBy: parseOptionalDate(duffelOrder.payment_status.payment_required_by),
      priceGuaranteeExpiresAt: parseOptionalDate(
        duffelOrder.payment_status.price_guarantee_expires_at
      ),
      paidAt: parseOptionalDate(duffelOrder.payment_status.paid_at),
      orderSnapshot: buildFlightOrderSnapshot({
        offer,
        order: duffelOrder,
        paymentMode: "pay_now",
        currency: snapshot.sourceCurrency,
        sellAmount: input.session.sellAmount,
        contact: snapshot.contact,
        travelers: snapshot.passengers.map((passenger) => ({
          id: passenger.id,
          type: passenger.type,
          title: passenger.title,
          givenName: passenger.givenName,
          familyName: passenger.familyName,
          bornOn: passenger.bornOn,
          gender: passenger.gender,
          email: passenger.email,
          phoneNumber: passenger.phoneNumber,
        })),
        now: input.now,
      }),
    },
    input.deps.orderRepository
  )

  await markPricedQuoteConsumed(snapshot.quoteId)
  incrementCheckoutMetric("quote_consumed", {
    checkoutSessionId: input.session.id,
    quoteId: snapshot.quoteId,
  })

  await input.deps.sessionRepository.update(input.session.id, {
    status: "completed",
    duffelOrderId: duffelOrder.id,
    providerPaymentId: input.providerPaymentId,
    finalizedAt: input.now,
    checkoutPayloadSnapshot: createTerminalCheckoutSnapshot({
      partialOfferRequestId: snapshot.partialOfferRequestId,
      offerId: snapshot.offerId,
      quoteId: snapshot.quoteId,
      selectedPartialOffers: snapshot.selectedPartialOffers,
      paymentMode: input.session.paymentMode,
      sourceCurrency: snapshot.sourceCurrency,
      netTotal: snapshot.netTotal,
      sellTotal: input.session.sellAmount,
      ancillaryServicesCount: ancillarySelection.services.length,
      metadataKeys: Object.keys(metadata),
    }),
    errorCode: null,
    errorMessage: null,
  })

  incrementCheckoutMetric("checkout_payment_success_total", {
    checkoutSessionId: input.session.id,
    duffelOrderId: duffelOrder.id,
  })

  await tryDispatchOrderNotification({
    eventType: "booking_confirmed",
    flightOrder,
    checkoutSessionId: input.session.id,
    statusLabel: "Confirmed",
  })
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

async function createFlightOrderWithReference(
  input: Omit<Parameters<FlightOrderRepository["create"]>[0], "bookingReference">,
  orderRepository: FlightOrderRepository
) {
  let attempts = 0

  while (attempts < 3) {
    attempts += 1

    try {
      return await orderRepository.create({
        ...input,
        bookingReference: createBookingReference(),
      })
    } catch (error) {
      if (isBookingReferenceConflict(error)) {
        continue
      }

      throw error
    }
  }

  throw new Error("Could not generate unique booking reference.")
}

function isBookingReferenceConflict(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }

  const maybeCode = (error as { code?: string }).code
  const maybeMessage = (error as { message?: string }).message

  return (
    maybeCode === "23505" &&
    typeof maybeMessage === "string" &&
    maybeMessage.includes("flight_orders_booking_reference_unique_idx")
  )
}

async function tryDispatchOrderNotification(input: {
  eventType: "booking_confirmed" | "hold_created"
  flightOrder: Awaited<ReturnType<FlightOrderRepository["create"]>>
  checkoutSessionId: string
  statusLabel: string
}) {
  try {
    await enqueueNotification({
      eventType: input.eventType,
      flightOrderId: input.flightOrder.id,
      checkoutSessionId: input.checkoutSessionId,
      bookingReference: input.flightOrder.bookingReference,
      recipientEmail: input.flightOrder.contactEmail,
      recipientEmailHash: input.flightOrder.contactEmailHash,
      payload: {
        bookingReference: input.flightOrder.bookingReference,
        routeLabel: readSnapshotRouteLabel(input.flightOrder.orderSnapshot),
        amountLabel: formatCurrencyAmount(
          input.flightOrder.sellAmount,
          input.flightOrder.currency
        ),
        statusLabel: input.statusLabel,
      },
    })
    await dispatchPendingNotifications({ limit: 1 })
  } catch (error) {
    logFlightFlowError("checkout.notifications", "dispatch_failed", error, {
      checkoutSessionId: input.checkoutSessionId,
      flightOrderId: input.flightOrder.id,
      eventType: input.eventType,
    })
  }
}

async function queueReconciliationNotificationForSession(
  session: Awaited<ReturnType<CheckoutSessionRepository["findById"]>>
) {
  if (!session) {
    return
  }

  const contactEmail = extractContactEmailFromSnapshot(session.checkoutPayloadSnapshot)

  if (!contactEmail) {
    return
  }

  try {
    await enqueueNotification({
      eventType: "reconciliation_required",
      flightOrderId: null,
      checkoutSessionId: session.id,
      bookingReference: null,
      recipientEmail: contactEmail,
      recipientEmailHash: createEmailHash(contactEmail),
      payload: {
        bookingReference: "Pending confirmation",
        routeLabel: session.offerId,
        amountLabel: formatCurrencyAmount(session.sellAmount, session.currency),
        statusLabel: "Manual reconciliation required",
      },
    })
    await dispatchPendingNotifications({ limit: 1 })
  } catch (error) {
    logFlightFlowError("checkout.notifications", "reconciliation_dispatch_failed", error, {
      checkoutSessionId: session.id,
    })
  }
}

function extractContactEmailFromSnapshot(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null
  }

  const maybeContact = (snapshot as { contact?: unknown }).contact

  if (!maybeContact || typeof maybeContact !== "object" || Array.isArray(maybeContact)) {
    return null
  }

  const email = (maybeContact as { email?: unknown }).email
  return typeof email === "string" && email.trim().length > 0 ? email.trim() : null
}

function readSnapshotRouteLabel(snapshot: Record<string, unknown>) {
  const routeLabel = snapshot.routeLabel
  return typeof routeLabel === "string" && routeLabel.trim().length > 0
    ? routeLabel
    : "Route unavailable"
}

function buildStripePaymentPreview(input: {
  fareSellAmount: number
  sourceCurrency: string
}): CheckoutPageData["payment"] {
  try {
    const sourceCurrency = input.sourceCurrency.trim().toUpperCase()

    if (!sourceCurrency) {
      throw new Error("Stripe pay_now is unavailable for an unknown currency.")
    }

    if (!Number.isFinite(input.fareSellAmount) || input.fareSellAmount <= 0) {
      throw new Error(
        `Stripe pay_now is unavailable for ${sourceCurrency}. Invalid charge amount.`
      )
    }

    const chargeAmount = roundToCurrency(input.fareSellAmount, sourceCurrency)

    return {
      provider: "stripe",
      checkoutUi: "hosted",
      payNowEnabled: true,
      unavailableReason: null,
      chargeAmount,
      chargeCurrency: sourceCurrency,
      chargeAmountLabel: formatCurrencyAmount(chargeAmount, sourceCurrency),
    }
  } catch (error) {
    return {
      provider: "stripe",
      checkoutUi: "hosted",
      payNowEnabled: false,
      unavailableReason: toPayNowUnavailableReason(error),
      chargeAmount: null,
      chargeCurrency: input.sourceCurrency.trim().toUpperCase() || "USD",
      chargeAmountLabel: null,
    }
  }
}

async function createStripeCheckoutSession(input: {
  checkoutSessionId: string
  partialOfferRequestId: string
  offerId: string
  quoteId: string
  selectedPartialOffers: string[]
  contact: CheckoutSubmitInput["contact"]
  chargeAmount: number
  chargeCurrency: string
}) {
  const stripe = getStripeClient()
  const urls = buildStripeCheckoutUrls({
    partialOfferRequestId: input.partialOfferRequestId,
    checkoutSessionId: input.checkoutSessionId,
    offerId: input.offerId,
    quoteId: input.quoteId,
    selectedPartialOffers: input.selectedPartialOffers,
  })

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
    currency: input.chargeCurrency.toLowerCase(),
    client_reference_id: input.checkoutSessionId,
    customer_email: input.contact.email,
    metadata: {
      checkout_session_id: input.checkoutSessionId,
      partial_offer_request_id: input.partialOfferRequestId,
      quote_id: input.quoteId,
      offer_id: input.offerId,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.chargeCurrency.toLowerCase(),
          unit_amount: toStripeAmountMinorUnit(input.chargeAmount, input.chargeCurrency),
          product_data: {
            name: `Flight booking ${input.partialOfferRequestId}`,
          },
        },
      },
    ],
  })

  if (!session.url) {
    throw new Error("Stripe Checkout session did not include a redirect URL.")
  }

  return session
}

function buildStripeCheckoutUrls(input: {
  partialOfferRequestId: string
  checkoutSessionId: string
  offerId: string
  quoteId: string
  selectedPartialOffers: string[]
}) {
  const { appBaseUrl } = getStripeConfig()
  const successParams = toCheckoutUrlSearchParams({
    offerId: input.offerId,
    selectedPartialOffers: input.selectedPartialOffers,
    quoteId: input.quoteId,
    step: "pay",
    status: "processing",
    sessionId: input.checkoutSessionId,
  })
  const cancelParams = toCheckoutUrlSearchParams({
    offerId: input.offerId,
    selectedPartialOffers: input.selectedPartialOffers,
    quoteId: input.quoteId,
    step: "pay",
    sessionId: input.checkoutSessionId,
    cancelled: true,
  })

  return {
    successUrl: `${appBaseUrl}/results/${input.partialOfferRequestId}/checkout?${successParams.toString()}`,
    cancelUrl: `${appBaseUrl}/results/${input.partialOfferRequestId}/checkout?${cancelParams.toString()}`,
  }
}

async function resolveCheckoutSessionFromStripeSession(
  stripeSession: Stripe.Checkout.Session,
  deps: CheckoutServiceDeps
) {
  const clientReferenceId =
    typeof stripeSession.client_reference_id === "string"
      ? stripeSession.client_reference_id.trim()
      : ""

  if (clientReferenceId) {
    const session = await deps.sessionRepository.findById(clientReferenceId)

    if (session) {
      return session
    }
  }

  const metadataCheckoutSessionId = stripeSession.metadata?.checkout_session_id?.trim()

  if (metadataCheckoutSessionId) {
    const session = await deps.sessionRepository.findById(metadataCheckoutSessionId)

    if (session) {
      return session
    }
  }

  return deps.sessionRepository.findByProviderOrderId(stripeSession.id)
}

function fromStripeAmountMinorUnit(amount: number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase()
  const digits = currencyMinorUnit(normalizedCurrency)
  const divisor = 10 ** digits
  return (amount / divisor).toFixed(digits)
}

function replaceCheckoutSnapshotContact(
  snapshot: unknown,
  contact: CheckoutSubmitInput["contact"]
) {
  const parsed = checkoutPayloadSnapshotSchema.safeParse(snapshot)

  if (!parsed.success) {
    return snapshot
  }

  return {
    ...parsed.data,
    contact,
  }
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
