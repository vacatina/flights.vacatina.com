import "server-only"

import { format } from "date-fns"
import type { CreateOrder, Offer, Order, SeatMap } from "@duffel/api/types"
import { z } from "zod"

import type { ActorContext } from "@/modules/auth/types"
import { serializeMoney, type SerializedMoney } from "@/modules/currency/domain"
import { toNumeric } from "@/lib/shared/number"
import {
  capturePayPalOrder,
  createPayPalOrder as createPayPalProviderOrder,
  getPayPalCaptureFromOrder,
  getPayPalCheckoutSessionIdFromResource,
  getPayPalOrder,
  type PayPalCapture,
  type PayPalWebhookEvent,
} from "@/modules/payments/server/providers/paypal"
import {
  buildCheckoutPageModel,
  computeAncillaryPricing,
  mapPassengersToCreateOrderPassengers,
  normalizeAncillarySelection,
  normalizeMetadataPairs,
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
  defaultPaymentOutboxRepository,
  type PaymentOutboxRepository,
} from "@/modules/payments/server/outbox-repository"
import {
  defaultPaymentAttemptsRepository,
  type PaymentAttemptRecord,
} from "@/modules/payments/server/attempts-repository"
import { defaultPaymentEventsRepository } from "@/modules/payments/server/events-repository"
import { createPaymentEventId } from "@/modules/payments/server/ids"
import { publishPaymentFulfillmentTask } from "@/modules/payments/server/job-publisher"
import { createPaymentOutboxId } from "@/modules/payments/server/ids"
import {
  incrementCheckoutMetric,
} from "@/modules/flights/checkout/server/metrics"
import {
  defaultCheckoutSessionRepository,
  type CheckoutSessionRecord,
  type CheckoutSessionRepository,
} from "@/modules/flights/checkout/server/session-repository"
import {
  buildCheckoutIdempotencyKey,
  createCheckoutSessionId,
  createFlightOrderId,
  createTerminalCheckoutSnapshot,
  doesSessionOwnerMatch,
  isPaymentAmountMatch,
  parseOptionalDate,
  roundToCurrency,
  statusToMessage,
  toAmountString,
  toPayNowUnavailableReason,
  toQuoteOwner,
  toQuoteValidationErrorMessage,
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
import { enqueueNotification, dispatchPendingNotifications } from "@/modules/notifications/server"
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

interface CapturePayPalOrderInput {
  actor: ActorContext
  checkoutSessionId: string
  paypalOrderId: string
}

interface ProcessPayPalWebhookEventInput {
  event: PayPalWebhookEvent
}

interface CheckoutSubmissionSuccess {
  checkoutSessionId: string
  flightOrderId: string
  duffelOrderId: string
  bookingReference: string
  paymentMode: "pay_now" | "hold"
  totalSellAmountLabel: string
  totalSellMoney: SerializedMoney
  paymentRequiredByLabel: string | null
}

interface CheckoutServiceDeps {
  now: () => Date
  getOfferById: (offerId: string) => Promise<Offer>
  getSeatMapsByOfferId: (offerId: string) => Promise<SeatMap[]>
  createOrder: (payload: CreateOrder) => Promise<Order>
  sessionRepository: CheckoutSessionRepository
  orderRepository: FlightOrderRepository
  paymentOutboxRepository: PaymentOutboxRepository
  publishFulfillmentTask: (input: {
    paymentAttemptId: string
    checkoutSessionId: string
  }) => Promise<unknown>
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
          type: z.enum([
            "passport",
            "tax_id",
            "known_traveler_number",
            "passenger_redress_number",
          ]),
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
  paymentOutboxRepository: defaultPaymentOutboxRepository,
  publishFulfillmentTask: publishPaymentFulfillmentTask,
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

  const paymentPreview = buildPayPalPaymentPreview({
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

export async function createCheckoutPayPalOrder(
  input: StartCheckoutPaymentInput,
  deps: CheckoutServiceDeps = defaultDeps
): Promise<CheckoutPaymentStartResult> {
  if (input.payload.paymentMode !== "pay_now") {
    throw new Error("Invalid payment mode for PayPal order creation.")
  }

  const now = deps.now()
  const prepared = await prepareCheckoutForSubmission({
    actor: input.actor,
    payload: input.payload,
    deps,
    now,
  })

  const paymentPreview = buildPayPalPaymentPreview({
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

      const existingProviderOrder = await getPayPalOrder(existingSession.providerOrderId)

      if (existingProviderOrder.status === "COMPLETED") {
        throw new Error("Payment already received. Waiting for booking confirmation.")
      }

      await deps.sessionRepository.update(existingSession.id, {
        status: "processing",
        providerStatusCode: existingProviderOrder.status ?? "CREATED",
        providerStatusMessage: existingProviderOrder.status ?? "CREATED",
        checkoutPayloadSnapshot: replaceCheckoutSnapshotContact(
          existingSession.checkoutPayloadSnapshot,
          input.payload.contact
        ),
        errorCode: null,
        errorMessage: null,
      })

      return {
        checkoutSessionId: existingSession.id,
        paypalOrderId: existingSession.providerOrderId,
        chargeAmount: existingSession.paymentAmount,
        chargeCurrency: existingSession.paymentCurrency ?? existingSession.currency,
        chargeAmountLabel: formatCurrencyAmount(
          existingSession.paymentAmount,
          existingSession.paymentCurrency ?? existingSession.currency
        ),
        chargeMoney: serializeMoney(
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
  const paypalOrder = await createPayPalProviderOrder({
    checkoutSessionId,
    partialOfferRequestId: input.payload.partialOfferRequestId,
    offerId: input.payload.offerId,
    quoteId: input.payload.quoteId,
    amount: paymentPreview.chargeAmount ?? 0,
    currency: paymentPreview.chargeCurrency,
    contactEmail: input.payload.contact.email,
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
    paymentProvider: "paypal",
    providerOrderId: paypalOrder.id,
    providerPaymentId: null,
    providerStatusCode: paypalOrder.status ?? "CREATED",
    providerStatusMessage: paypalOrder.status ?? "CREATED",
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
  incrementCheckoutMetric("paypal_order_create_total", {
    checkoutSessionId,
  })

  logFlightFlow("checkout.paypal", "order_created", {
    checkoutSessionId,
    partialOfferRequestId: input.payload.partialOfferRequestId,
    offerId: input.payload.offerId,
    providerOrderId: paypalOrder.id,
    chargeAmount: paymentPreview.chargeAmount,
    chargeCurrency: paymentPreview.chargeCurrency,
  })

  return {
    checkoutSessionId,
    paypalOrderId: paypalOrder.id,
    chargeAmount: paymentPreview.chargeAmount ?? 0,
    chargeCurrency: paymentPreview.chargeCurrency,
    chargeAmountLabel:
      paymentPreview.chargeAmountLabel ??
      formatCurrencyAmount(0, paymentPreview.chargeCurrency),
    chargeMoney: serializeMoney(
      paymentPreview.chargeAmount ?? 0,
      paymentPreview.chargeCurrency
    ),
    status: "processing",
  }
}

export async function captureCheckoutPayPalOrder(
  input: CapturePayPalOrderInput,
  deps: CheckoutServiceDeps = defaultDeps
): Promise<CheckoutSessionStatusResult> {
  const session = await deps.sessionRepository.findById(input.checkoutSessionId)

  if (!session) {
    throw new Error("Checkout session not found.")
  }

  if (!doesSessionOwnerMatch(session, input.actor)) {
    throw new Error("Checkout session ownership mismatch.")
  }

  if (session.providerOrderId !== input.paypalOrderId) {
    throw new Error("PayPal order does not match checkout session.")
  }

  if (session.status === "completed") {
    return getCheckoutSessionStatus(
      { actor: input.actor, checkoutSessionId: input.checkoutSessionId },
      deps
    )
  }

  incrementCheckoutMetric("paypal_capture_total", {
    checkoutSessionId: session.id,
  })

  const capturedOrder = await capturePayPalOrder(input.paypalOrderId)
  const capture = getPayPalCaptureFromOrder(capturedOrder)
  logFlightFlow("checkout.paypal", "capture_response_received", {
    checkoutSessionId: session.id,
    providerOrderId: input.paypalOrderId,
    providerOrderStatus: capturedOrder.status ?? null,
    providerCaptureId: capture?.id ?? null,
    providerCaptureStatus: capture?.status ?? null,
  })
  await processVerifiedPayPalCapture({
    session,
    capture,
    orderStatus: capturedOrder.status ?? null,
    deps,
    now: deps.now(),
    source: "capture_action",
  })

  const refreshedSession = await deps.sessionRepository.findById(session.id)
  await syncPaymentAttemptAfterCapture({
    session: refreshedSession ?? session,
    captureId: capture?.id ?? null,
    captureStatus: capture?.status ?? null,
  })

  return getCheckoutSessionStatus(
    { actor: input.actor, checkoutSessionId: input.checkoutSessionId },
    deps
  )
}

export async function submitCheckout(
  input: SubmitCheckoutInput,
  deps: CheckoutServiceDeps = defaultDeps
): Promise<CheckoutSubmissionSuccess> {
  if (input.payload.paymentMode !== "hold") {
    throw new Error("Pay now uses PayPal checkout flow. Please retry with pay now.")
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
          totalSellMoney: serializeMoney(
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
      existingSession.status === "payment_authorized" ||
      existingSession.status === "finalizing"
    ) {
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
      totalSellMoney: serializeMoney(
        prepared.sellTotal,
        prepared.quote.currency
      ),
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
      totalChargeMoney:
        session.paymentAmount !== null && session.paymentCurrency
          ? serializeMoney(session.paymentAmount, session.paymentCurrency)
          : order
            ? serializeMoney(order.sellAmount, order.currency)
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
    totalChargeMoney:
      session.paymentAmount !== null && session.paymentCurrency
        ? serializeMoney(session.paymentAmount, session.paymentCurrency)
        : null,
  }
}

export async function processPayPalWebhookEvent(
  input: ProcessPayPalWebhookEventInput,
  deps: CheckoutServiceDeps = defaultDeps
) {
  incrementCheckoutMetric("paypal_webhook_total")
  const eventId = typeof input.event.id === "string" ? input.event.id : ""
  const eventType = typeof input.event.event_type === "string" ? input.event.event_type : ""

  const session = await resolveCheckoutSessionFromPayPalResource(input.event.resource, deps)

  if (!session) {
    throw new Error("Checkout session not found for PayPal webhook event.")
  }

  if (session.status === "completed" && eventType === "PAYMENT.CAPTURE.COMPLETED") {
    logFlightFlow("checkout.paypal", "webhook_ignored_completed_session", {
      checkoutSessionId: session.id,
      eventId,
      eventType,
    })
    return
  }

  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    await processVerifiedPayPalCapture({
      session,
      capture: toPayPalCapture(input.event.resource),
      orderStatus: "COMPLETED",
      deps,
      now: deps.now(),
      source: "webhook",
    })
    return
  }

  if (
    eventType === "PAYMENT.CAPTURE.DENIED" ||
    eventType === "PAYMENT.CAPTURE.DECLINED" ||
    eventType === "CHECKOUT.ORDER.VOIDED"
  ) {
    await markPayPalPaymentFailed({
      session,
      deps,
      statusCode: readPayPalResourceStatus(input.event.resource) ?? eventType,
      providerPaymentId: readPayPalResourceId(input.event.resource),
      errorCode: "paypal_payment_failed",
      errorMessage: "PayPal payment was not completed successfully.",
    })
    return
  }

  if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
    await deps.sessionRepository.update(session.id, {
      status: "reconciliation_required",
      providerPaymentId: readPayPalResourceId(input.event.resource),
      providerStatusCode: readPayPalResourceStatus(input.event.resource) ?? eventType,
      providerStatusMessage: eventType,
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
      errorCode: "paypal_capture_refunded",
      errorMessage: "PayPal capture was refunded. Support will reconcile this booking.",
    })
    incrementCheckoutMetric("checkout_reconciliation_required_total", {
      checkoutSessionId: session.id,
      reason: "capture_refunded",
    })
    await queueReconciliationNotificationForSession(session)
  }
}

async function processVerifiedPayPalCapture(input: {
  session: NonNullable<Awaited<ReturnType<CheckoutSessionRepository["findById"]>>>
  capture: PayPalCapture | null
  orderStatus: string | null
  deps: CheckoutServiceDeps
  now: Date
  source: "capture_action" | "webhook"
}) {
  if (!input.capture || input.capture.status !== "COMPLETED") {
    await markPayPalPaymentFailed({
      session: input.session,
      deps: input.deps,
      statusCode: input.capture?.status ?? input.orderStatus ?? "UNKNOWN",
      providerPaymentId: input.capture?.id ?? null,
      errorCode: "paypal_capture_not_completed",
      errorMessage: "PayPal payment was not completed successfully.",
    })
    return
  }

  if (
    !isPaymentAmountMatch({
      expectedAmount: input.session.paymentAmount,
      expectedCurrency: input.session.paymentCurrency,
      actualAmount: input.capture.amount?.value ?? "",
      actualCurrency:
        input.capture.amount?.currency_code ??
        input.session.paymentCurrency ??
        input.session.currency,
    })
  ) {
    await input.deps.sessionRepository.update(input.session.id, {
      status: "reconciliation_required",
      providerPaymentId: input.capture.id,
      providerStatusCode: input.capture.status,
      providerStatusMessage: input.orderStatus ?? input.capture.status,
      paymentConfirmedAt: input.now,
      checkoutPayloadSnapshot: createTerminalCheckoutSnapshot({
        partialOfferRequestId: input.session.partialOfferRequestId,
        offerId: input.session.offerId,
        quoteId: input.session.quoteId,
        selectedPartialOffers: input.session.selectedPartialOffers,
        paymentMode: input.session.paymentMode,
        sourceCurrency: input.session.currency,
        netTotal: input.session.netAmount,
        sellTotal: input.session.sellAmount,
      }),
      errorCode: "paypal_amount_mismatch",
      errorMessage:
        "Payment amount/currency mismatch detected. Support will reconcile this payment.",
    })
    incrementCheckoutMetric("checkout_reconciliation_required_total", {
      checkoutSessionId: input.session.id,
      reason: "amount_mismatch",
      source: input.source,
    })
    await queueReconciliationNotificationForSession(input.session)
    return
  }

  await input.deps.sessionRepository.update(input.session.id, {
    status: "payment_authorized",
    providerPaymentId: input.capture.id,
    providerStatusCode: input.capture.status,
    providerStatusMessage: input.orderStatus ?? input.capture.status,
    paymentConfirmedAt: input.now,
    errorCode: null,
    errorMessage: null,
  })

  if (!input.session.paymentAttemptId) {
    await input.deps.sessionRepository.update(input.session.id, {
      status: "reconciliation_required",
      checkoutPayloadSnapshot: createTerminalCheckoutSnapshot({
        partialOfferRequestId: input.session.partialOfferRequestId,
        offerId: input.session.offerId,
        quoteId: input.session.quoteId,
        selectedPartialOffers: input.session.selectedPartialOffers,
        paymentMode: input.session.paymentMode,
        sourceCurrency: input.session.currency,
        netTotal: input.session.netAmount,
        sellTotal: input.session.sellAmount,
      }),
      errorCode: "payment_attempt_missing",
      errorMessage:
        "Payment received but booking confirmation is pending payment reconciliation.",
    })
    incrementCheckoutMetric("checkout_reconciliation_required_total", {
      checkoutSessionId: input.session.id,
      reason: "payment_attempt_missing",
      source: input.source,
    })
    await queueReconciliationNotificationForSession(input.session)
    return
  }

  const outboxTask = await input.deps.paymentOutboxRepository.enqueueUnique({
    id: createPaymentOutboxId(),
    taskType: "fulfill_paid_resource",
    uniqueKey: `fulfill_paid_resource:${input.session.paymentAttemptId}`,
    paymentAttemptId: input.session.paymentAttemptId,
    internalOrderType: "flight_checkout",
    internalOrderId: input.session.id,
    payload: {
      provider: "paypal",
      providerPaymentId: input.capture.id,
      source: input.source,
    },
    nextAttemptAt: input.now,
  })
  await input.deps.publishFulfillmentTask({
    paymentAttemptId: outboxTask.paymentAttemptId,
    checkoutSessionId: outboxTask.internalOrderId,
  })
  incrementCheckoutMetric("payment_fulfillment_enqueued_total", {
    checkoutSessionId: input.session.id,
    source: input.source,
  })
}

async function syncPaymentAttemptAfterCapture(input: {
  session: CheckoutSessionRecord
  captureId: string | null
  captureStatus: string | null
}) {
  if (!input.session.paymentAttemptId) {
    logFlightFlow("checkout.paypal", "payment_attempt_sync_skipped", {
      checkoutSessionId: input.session.id,
      reason: "payment_attempt_missing",
      providerCaptureId: input.captureId,
    })
    return
  }

  const attempt = await defaultPaymentAttemptsRepository.findById(
    input.session.paymentAttemptId
  )

  if (!attempt) {
    logFlightFlow("checkout.paypal", "payment_attempt_sync_skipped", {
      checkoutSessionId: input.session.id,
      paymentAttemptId: input.session.paymentAttemptId,
      reason: "payment_attempt_not_found",
      providerCaptureId: input.captureId,
    })
    return
  }

  const status = toPaymentAttemptStatusAfterCapture(input.session.status)
  const updated = await defaultPaymentAttemptsRepository.update(attempt.id, {
    status,
    providerCaptureId: input.captureId,
    providerStatus: input.captureStatus,
    failureCode: input.session.errorCode,
    failureMessage: input.session.errorMessage,
  })
  const eventAttempt = updated ?? {
    ...attempt,
    status,
    providerCaptureId: input.captureId,
    providerStatus: input.captureStatus,
  }

  if (status === "capture_completed") {
    await appendPaymentCaptureEvent(eventAttempt)
  }

  logFlightFlow("checkout.paypal", "payment_attempt_synced", {
    checkoutSessionId: input.session.id,
    paymentAttemptId: attempt.id,
    previousProviderCaptureId: attempt.providerCaptureId,
    providerCaptureId: eventAttempt.providerCaptureId,
    status: eventAttempt.status,
  })
}

async function appendPaymentCaptureEvent(attempt: PaymentAttemptRecord) {
  const events = await defaultPaymentEventsRepository.listByAttemptId(attempt.id)

  if (events.some((event) => event.eventType === "CAPTURE_COMPLETED")) {
    return
  }

  await defaultPaymentEventsRepository.append({
    id: createPaymentEventId(),
    paymentAttemptId: attempt.id,
    eventType: "CAPTURE_COMPLETED",
    provider: attempt.provider,
    providerOrderId: attempt.providerOrderId,
    providerCaptureId: attempt.providerCaptureId,
    amount: attempt.amount,
    currency: attempt.currency,
  })
}

function toPaymentAttemptStatusAfterCapture(
  status: CheckoutSessionRecord["status"]
) {
  if (status === "payment_authorized") {
    return "capture_completed" as const
  }

  if (status === "reconciliation_required") {
    return "reconciliation_required" as const
  }

  return "capture_failed" as const
}

export async function fulfillAuthorizedCheckoutSession(input: {
  checkoutSessionId: string
  paymentProvider: "paypal"
  providerPaymentId: string | null
  deps?: CheckoutServiceDeps
}) {
  const deps = input.deps ?? defaultDeps
  const session = await deps.sessionRepository.findById(input.checkoutSessionId)

  if (!session) {
    throw new Error("Checkout session not found.")
  }

  if (session.status === "completed") {
    const existingOrder = await deps.orderRepository.findByCheckoutSessionId(session.id)

    if (existingOrder) {
      return existingOrder
    }
  }

  if (session.status !== "payment_authorized") {
    throw new Error("Checkout session is not ready for fulfillment.")
  }

  const now = deps.now()
  const claimedSession = await deps.sessionRepository.claimFinalization({
    checkoutSessionId: session.id,
    now,
  })

  if (!claimedSession) {
    const refreshed = await deps.sessionRepository.findById(session.id)

    if (refreshed?.status === "completed") {
      const existingOrder = await deps.orderRepository.findByCheckoutSessionId(session.id)

      if (existingOrder) {
        return existingOrder
      }
    }

    throw new Error("Checkout session finalization is already in progress.")
  }

  try {
    return await finalizeAuthorizedCheckoutSession({
      session: claimedSession,
      deps,
      now,
      paymentProvider: input.paymentProvider,
      providerPaymentId: input.providerPaymentId,
    })
  } catch (error) {
    await deps.sessionRepository.update(claimedSession.id, {
      status: "reconciliation_required",
      providerPaymentId: input.providerPaymentId,
      checkoutPayloadSnapshot: createTerminalCheckoutSnapshot({
        partialOfferRequestId: claimedSession.partialOfferRequestId,
        offerId: claimedSession.offerId,
        quoteId: claimedSession.quoteId,
        selectedPartialOffers: claimedSession.selectedPartialOffers,
        paymentMode: claimedSession.paymentMode,
        sourceCurrency: claimedSession.currency,
        netTotal: claimedSession.netAmount,
        sellTotal: claimedSession.sellAmount,
      }),
      errorCode: "finalization_failed_after_payment_authorized",
      errorMessage:
        "Payment was received, but booking finalization needs manual reconciliation.",
    })
    incrementCheckoutMetric("checkout_reconciliation_required_total", {
      checkoutSessionId: claimedSession.id,
      reason: "finalization_failed",
    })
    await queueReconciliationNotificationForSession(claimedSession)
    throw error
  }
}

async function markPayPalPaymentFailed(input: {
  session: NonNullable<Awaited<ReturnType<CheckoutSessionRepository["findById"]>>>
  deps: CheckoutServiceDeps
  statusCode: string
  providerPaymentId: string | null
  errorCode: string
  errorMessage: string
}) {
  await input.deps.sessionRepository.update(input.session.id, {
    status: "failed",
    providerPaymentId: input.providerPaymentId,
    providerStatusCode: input.statusCode,
    providerStatusMessage: input.statusCode,
    checkoutPayloadSnapshot: createTerminalCheckoutSnapshot({
      partialOfferRequestId: input.session.partialOfferRequestId,
      offerId: input.session.offerId,
      quoteId: input.session.quoteId,
      selectedPartialOffers: input.session.selectedPartialOffers,
      paymentMode: input.session.paymentMode,
      sourceCurrency: input.session.currency,
      netTotal: input.session.netAmount,
      sellTotal: input.session.sellAmount,
    }),
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
  })
  incrementCheckoutMetric("checkout_payment_failed_total", {
    checkoutSessionId: input.session.id,
    statusCode: input.statusCode,
  })
}

async function finalizeAuthorizedCheckoutSession(input: {
  session: NonNullable<Awaited<ReturnType<CheckoutSessionRepository["findById"]>>>
  deps: CheckoutServiceDeps
  now: Date
  paymentProvider: "paypal"
  providerPaymentId: string | null
}) {
  const existingOrder = await input.deps.orderRepository.findByCheckoutSessionId(
    input.session.id
  )

  if (existingOrder) {
    await input.deps.sessionRepository.update(input.session.id, {
      status: "completed",
      duffelOrderId: existingOrder.duffelOrderId,
      providerPaymentId: input.providerPaymentId,
      finalizedAt: input.now,
      errorCode: null,
      errorMessage: null,
    })
    return existingOrder
  }

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
      paymentAttemptId: input.session.paymentAttemptId,
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

  return flightOrder
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
  const seatMaps = await input.deps.getSeatMapsByOfferId(input.payload.offerId)
  const ancillarySelection = normalizeAncillarySelection(input.payload.ancillarySelection)
  const ancillaryPricing = computeAncillaryPricing({
    offer,
    seatMaps,
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

function buildPayPalPaymentPreview(input: {
  fareSellAmount: number
  sourceCurrency: string
}): CheckoutPageData["payment"] {
  try {
    const sourceCurrency = input.sourceCurrency.trim().toUpperCase()

    if (!sourceCurrency) {
      throw new Error("PayPal pay_now is unavailable for an unknown currency.")
    }

    if (!Number.isFinite(input.fareSellAmount) || input.fareSellAmount <= 0) {
      throw new Error(
        `PayPal pay_now is unavailable for ${sourceCurrency}. Invalid charge amount.`
      )
    }

    const chargeAmount = roundToCurrency(input.fareSellAmount, sourceCurrency)

    return {
      provider: "paypal",
      checkoutUi: "buttons",
      paypalEnvironment: toPayPalClientEnvironment(),
      payNowEnabled: true,
      unavailableReason: null,
      chargeAmount,
      chargeCurrency: sourceCurrency,
      chargeAmountLabel: formatCurrencyAmount(chargeAmount, sourceCurrency),
      chargeMoney: serializeMoney(chargeAmount, sourceCurrency),
    }
  } catch (error) {
    return {
      provider: "paypal",
      checkoutUi: "buttons",
      paypalEnvironment: toPayPalClientEnvironment(),
      payNowEnabled: false,
      unavailableReason: toPayNowUnavailableReason(error),
      chargeAmount: null,
      chargeCurrency: input.sourceCurrency.trim().toUpperCase() || "USD",
      chargeAmountLabel: null,
      chargeMoney: null,
    }
  }
}

function toPayPalClientEnvironment(): CheckoutPageData["payment"]["paypalEnvironment"] {
  return process.env.PAYPAL_ENV?.trim().toLowerCase() === "live"
    ? "production"
    : "sandbox"
}

async function resolveCheckoutSessionFromPayPalResource(
  resource: unknown,
  deps: CheckoutServiceDeps
) {
  const checkoutSessionId = getPayPalCheckoutSessionIdFromResource(resource)

  if (checkoutSessionId) {
    const session = await deps.sessionRepository.findById(checkoutSessionId)

    if (session) {
      return session
    }
  }

  const orderId = readPayPalResourceOrderId(resource)

  if (orderId) {
    return deps.sessionRepository.findByProviderOrderId(orderId)
  }

  return null
}

function toPayPalCapture(resource: unknown): PayPalCapture | null {
  if (!resource || typeof resource !== "object") {
    return null
  }

  const value = resource as PayPalCapture

  if (!value.id) {
    return null
  }

  return value
}

function readPayPalResourceId(resource: unknown) {
  if (!resource || typeof resource !== "object") {
    return null
  }

  const id = (resource as { id?: unknown }).id
  return typeof id === "string" && id.trim() ? id.trim() : null
}

function readPayPalResourceStatus(resource: unknown) {
  if (!resource || typeof resource !== "object") {
    return null
  }

  const status = (resource as { status?: unknown }).status
  return typeof status === "string" && status.trim() ? status.trim() : null
}

function readPayPalResourceOrderId(resource: unknown) {
  if (!resource || typeof resource !== "object") {
    return null
  }

  const value = resource as {
    supplementary_data?: {
      related_ids?: {
        order_id?: unknown
      }
    }
  }
  const orderId = value.supplementary_data?.related_ids?.order_id

  return typeof orderId === "string" && orderId.trim() ? orderId.trim() : null
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
