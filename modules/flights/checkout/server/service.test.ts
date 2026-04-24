import { beforeEach, expect, test, vi } from "vitest"
import type { Offer, Order, SeatMap } from "@duffel/api/types"
import type { CheckoutSubmitInput } from "@/modules/flights/checkout/domain"
import type {
  CheckoutSessionRecord,
  CheckoutSessionRepository,
} from "@/modules/flights/checkout/server/session-repository"
import type {
  FlightOrderRecord,
  FlightOrderRepository,
} from "@/modules/flights/checkout/server/order-repository"
import type { PaymentWebhookEventRepository } from "@/modules/flights/checkout/server/payment-webhook-event-repository"

const mockFns = vi.hoisted(() => ({
  validatePricedQuote: vi.fn(),
  markPricedQuoteConsumed: vi.fn(),
  formatCurrencyAmount: vi.fn((amount: number, currency: string) =>
    `${currency} ${amount.toFixed(2)}`
  ),
  getCheckoutServerConfig: vi.fn(),
  getAirlineLogosByAirlineId: vi.fn(),
  incrementCheckoutMetric: vi.fn(),
  buildCheckoutPageModel: vi.fn(),
  getPayHereConfig: vi.fn(),
  convertToLkr: vi.fn(),
  createPayHereRequestHash: vi.fn(() => "HASH_1"),
  verifyPayHereNotifySignature: vi.fn(() => true),
  mapPayHereStatusCode: vi.fn(() => "success"),
}))

vi.mock("server-only", () => ({}))

vi.mock("@/modules/flights/pricing/server", () => ({
  validatePricedQuote: mockFns.validatePricedQuote,
  markPricedQuoteConsumed: mockFns.markPricedQuoteConsumed,
  formatCurrencyAmount: mockFns.formatCurrencyAmount,
}))

vi.mock("@/modules/flights/checkout/server/config", () => ({
  getCheckoutServerConfig: mockFns.getCheckoutServerConfig,
}))

vi.mock("@/modules/flights/results/server/airline-logos", () => ({
  getAirlineLogosByAirlineId: mockFns.getAirlineLogosByAirlineId,
}))

vi.mock("@/modules/flights/checkout/server/metrics", () => ({
  incrementCheckoutMetric: mockFns.incrementCheckoutMetric,
}))

vi.mock("@/modules/flights/payments/payhere", () => ({
  getPayHereConfig: mockFns.getPayHereConfig,
  convertToLkr: mockFns.convertToLkr,
  createPayHereRequestHash: mockFns.createPayHereRequestHash,
  verifyPayHereNotifySignature: mockFns.verifyPayHereNotifySignature,
  mapPayHereStatusCode: mockFns.mapPayHereStatusCode,
  toPayHereAmount: (value: number) => value.toFixed(2),
}))

vi.mock("@/modules/flights/checkout/domain", async () => {
  const actual =
    await vi.importActual<typeof import("@/modules/flights/checkout/domain")>(
      "@/modules/flights/checkout/domain"
    )

  return {
    ...actual,
    buildCheckoutPageModel: mockFns.buildCheckoutPageModel,
  }
})

import {
  fetchCheckoutPageData,
  getCheckoutSessionStatus,
  processPayHereNotification,
  startCheckoutPayment,
  submitCheckout,
} from "@/modules/flights/checkout/server/service"

const NOW = new Date("2026-04-13T10:00:00.000Z")

beforeEach(() => {
  vi.clearAllMocks()

  mockFns.validatePricedQuote.mockResolvedValue({
    ok: true,
    reason: null,
    quote: {
      id: "pqt_1",
      partialOfferRequestId: "prq_1",
      offerId: "off_1",
      selectedPartialOffers: ["off_partial_1"],
      ownerUserId: null,
      ownerGuestId: "gst_1",
      ownerOrgId: null,
      currency: "USD",
      netAmount: 100,
      sellAmount: 120,
      appliedRuleId: null,
      appliedRuleSpecificity: null,
      status: "active",
      expiresAt: new Date("2026-04-13T11:00:00.000Z"),
      createdAt: NOW,
      updatedAt: NOW,
    },
  })
  mockFns.markPricedQuoteConsumed.mockResolvedValue(undefined)
  mockFns.getCheckoutServerConfig.mockReturnValue({
    settlementPaymentType: "balance",
    ancillaryMarkupRatePercent: 0,
    ancillaryMarkupFixedAmount: 0,
    checkoutSessionTtlMinutes: 30,
  })
  mockFns.getAirlineLogosByAirlineId.mockResolvedValue({})
  mockFns.incrementCheckoutMetric.mockImplementation(() => undefined)
  mockFns.getPayHereConfig.mockReturnValue({
    merchantId: "merchant_1",
    merchantSecret: "secret",
    sandbox: true,
    scriptUrl: "https://www.payhere.lk/lib/payhere.js",
    notifyUrl: "https://example.com/api/payments/payhere/notify",
    returnUrl: "https://example.com/return",
    cancelUrl: "https://example.com/cancel",
    fxBufferPercent: 3,
    markupRatePercent: 0,
    markupFixedLkr: 0,
  })
  mockFns.convertToLkr.mockReturnValue({
    sourceCurrency: "USD",
    targetCurrency: "LKR",
    sourceAmount: 100,
    convertedAmount: 33_000,
    baseRate: 320,
    bufferPercent: 3,
    effectiveRate: 329.6,
  })
  mockFns.buildCheckoutPageModel.mockReturnValue({
    partialOfferRequestId: "prq_1",
    state: {
      offerId: "off_1",
      selectedPartialOffers: ["off_partial_1"],
      quoteId: "pqt_1",
      step: "traveler",
    },
    quote: {
      quoteId: "pqt_1",
      currency: "USD",
      fareNetAmount: 100,
      fareSellAmount: 120,
      fareSellAmountLabel: "USD 120.00",
      expiresAtIso: "2026-04-13T11:00:00.000Z",
      expiresAtLabel: "13/04/2026, 11:00",
    },
    tripSummary: {
      journeyTypeLabel: "One way",
      dateRangeLabel: "Date unavailable",
      passengersLabel: "1 passenger",
      cabinLabel: "Economy",
      routeLabel: "CMB ⇄ DXB",
      offerExpiresAtLabel: null,
    },
    selectedFlights: [],
    paymentRequirements: {
      requiresInstantPayment: false,
      canHold: true,
      paymentRequiredByIso: null,
      paymentRequiredByLabel: null,
      priceGuaranteeExpiresAtIso: null,
      priceGuaranteeExpiresAtLabel: null,
    },
    identityDocumentsRequired: false,
    supportedIdentityDocumentTypes: [],
    passengerDefaults: [],
    ancillary: {
      offer: createOffer(),
      seatMaps: [],
    },
    payHere: {
      payNowEnabled: true,
      unavailableReason: null,
      chargeCurrency: "LKR",
      estimatedFareAmountLkr: 33000,
      estimatedFareAmountLkrLabel: "LKR 33000.00",
      fxSourceCurrency: "USD",
      fxTargetCurrency: "LKR",
      fxBaseRate: 320,
      fxBufferPercent: 3,
      fxEffectiveRate: 329.6,
      scriptUrl: "https://www.payhere.lk/lib/payhere.js",
    },
  })
})

test("fetchCheckoutPageData includes payHere preview", async () => {
  const result = await fetchCheckoutPageData(
    {
      partialOfferRequestId: "prq_1",
      state: {
        offerId: "off_1",
        selectedPartialOffers: ["off_partial_1"],
        quoteId: "pqt_1",
        step: "traveler",
      },
      actor: {
        type: "guest",
        guestId: "gst_1",
      },
    },
    {
      now: () => NOW,
      getOfferById: async () => createOffer(),
      getSeatMapsByOfferId: async () => [] as SeatMap[],
      createOrder: async () => {
        throw new Error("not used")
      },
      sessionRepository: createSessionRepository().repo,
      orderRepository: createOrderRepository().repo,
      paymentWebhookEventRepository: createPaymentWebhookEventRepository(),
    }
  )

  expect(result.payHere.payNowEnabled).toBe(true)
  expect(result.payHere.estimatedFareAmountLkr).toBe(33000)
})

test("startCheckoutPayment creates processing session and payload", async () => {
  const sessionRepo = createSessionRepository()
  const result = await startCheckoutPayment(
    {
      actor: {
        type: "guest",
        guestId: "gst_1",
      },
      payload: createSubmitInput({
        paymentMode: "pay_now",
      }),
    },
    {
      now: () => NOW,
      getOfferById: async () => createOffer(),
      getSeatMapsByOfferId: async () => [] as SeatMap[],
      createOrder: async () => createDuffelOrder(),
      sessionRepository: sessionRepo.repo,
      orderRepository: createOrderRepository().repo,
      paymentWebhookEventRepository: createPaymentWebhookEventRepository(),
    }
  )

  expect(result.status).toBe("processing")
  expect(result.payment.currency).toBe("LKR")
  expect(sessionRepo.spies.create).toHaveBeenCalledTimes(1)
})

test("submitCheckout succeeds for hold flow", async () => {
  const result = await submitCheckout(
    {
      actor: {
        type: "guest",
        guestId: "gst_1",
      },
      payload: createSubmitInput({
        paymentMode: "hold",
      }),
    },
    {
      now: () => NOW,
      getOfferById: async () => createOffer(),
      getSeatMapsByOfferId: async () => [] as SeatMap[],
      createOrder: async () => createDuffelOrder(),
      sessionRepository: createSessionRepository().repo,
      orderRepository: createOrderRepository().repo,
      paymentWebhookEventRepository: createPaymentWebhookEventRepository(),
    }
  )

  expect(result.paymentMode).toBe("hold")
  expect(result.duffelOrderId).toBe("ord_1")
})

test("processPayHereNotification finalizes checkout on success", async () => {
  const sessionRepo = createSessionRepository()
  const orderRepo = createOrderRepository()

  const createdSession = await sessionRepo.repo.create({
    id: "chs_1",
    idempotencyKey: "idempotency_1",
    partialOfferRequestId: "prq_1",
    quoteId: "pqt_1",
    offerId: "off_1",
    selectedPartialOffers: ["off_partial_1"],
    ownerUserId: null,
    ownerGuestId: "gst_1",
    ownerOrgId: null,
    paymentMode: "pay_now",
    currency: "USD",
    netAmount: 100,
    sellAmount: 120,
    paymentProvider: "payhere",
    providerOrderId: "chs_1",
    providerPaymentId: null,
    providerStatusCode: null,
    providerStatusMessage: null,
    paymentCurrency: "LKR",
    paymentAmount: 33000,
    fxSourceCurrency: "USD",
    fxTargetCurrency: "LKR",
    fxBaseRate: 320,
    fxBufferPercent: 3,
    fxEffectiveRate: 329.6,
    checkoutPayloadSnapshot: {
      partialOfferRequestId: "prq_1",
      offerId: "off_1",
      quoteId: "pqt_1",
      selectedPartialOffers: ["off_partial_1"],
      contact: {
        email: "guest@example.com",
        phoneNumber: "+94771234567",
      },
      billing: {
        address: "1 Main Street",
        city: "Colombo",
        country: "Sri Lanka",
      },
      passengers: createSubmitInput({ paymentMode: "pay_now" }).passengers,
      metadata: [],
      ancillarySelection: {
        services: [],
        metadata: null,
      },
      netTotal: 100,
      sourceCurrency: "USD",
    },
    status: "processing",
    paymentInitiatedAt: NOW,
    paymentConfirmedAt: null,
    finalizedAt: null,
    expiresAt: new Date("2026-04-13T11:00:00.000Z"),
  })

  await processPayHereNotification(
    {
      payload: {
        merchant_id: "merchant_1",
        order_id: createdSession.id,
        payment_id: "pay_1",
        payhere_amount: "33000.00",
        payhere_currency: "LKR",
        status_code: "2",
        md5sig: "VALID",
      },
    },
    {
      now: () => NOW,
      getOfferById: async () => createOffer(),
      getSeatMapsByOfferId: async () => [] as SeatMap[],
      createOrder: async () => createDuffelOrder(),
      sessionRepository: sessionRepo.repo,
      orderRepository: orderRepo.repo,
      paymentWebhookEventRepository: createPaymentWebhookEventRepository(),
    }
  )

  const finalized = await sessionRepo.repo.findById(createdSession.id)
  expect(finalized?.status).toBe("completed")
})

test("getCheckoutSessionStatus enforces actor ownership", async () => {
  const sessionRepo = createSessionRepository()
  const createdSession = await sessionRepo.repo.create({
    id: "chs_2",
    idempotencyKey: "idempotency_2",
    partialOfferRequestId: "prq_1",
    quoteId: "pqt_1",
    offerId: "off_1",
    selectedPartialOffers: ["off_partial_1"],
    ownerUserId: null,
    ownerGuestId: "gst_owner",
    ownerOrgId: null,
    paymentMode: "pay_now",
    currency: "USD",
    netAmount: 100,
    sellAmount: 120,
    paymentProvider: "payhere",
    providerOrderId: "chs_2",
    providerPaymentId: null,
    providerStatusCode: null,
    providerStatusMessage: null,
    paymentCurrency: "LKR",
    paymentAmount: 33000,
    fxSourceCurrency: "USD",
    fxTargetCurrency: "LKR",
    fxBaseRate: 320,
    fxBufferPercent: 3,
    fxEffectiveRate: 329.6,
    checkoutPayloadSnapshot: null,
    status: "processing",
    paymentInitiatedAt: NOW,
    paymentConfirmedAt: null,
    finalizedAt: null,
    expiresAt: new Date("2026-04-13T11:00:00.000Z"),
  })

  await expect(
    getCheckoutSessionStatus(
      {
        actor: {
          type: "guest",
          guestId: "gst_other",
        },
        checkoutSessionId: createdSession.id,
      },
      {
        now: () => NOW,
        getOfferById: async () => createOffer(),
        getSeatMapsByOfferId: async () => [] as SeatMap[],
        createOrder: async () => createDuffelOrder(),
        sessionRepository: sessionRepo.repo,
        orderRepository: createOrderRepository().repo,
        paymentWebhookEventRepository: createPaymentWebhookEventRepository(),
      }
    )
  ).rejects.toThrow("ownership mismatch")
})

function createSubmitInput(input: {
  paymentMode: "pay_now" | "hold"
}): CheckoutSubmitInput {
  return {
    partialOfferRequestId: "prq_1",
    offerId: "off_1",
    quoteId: "pqt_1",
    selectedPartialOffers: ["off_partial_1"],
    paymentMode: input.paymentMode,
    contact: {
      email: "guest@example.com",
      phoneNumber: "+94771234567",
    },
    billing: {
      address: "1 Main Street",
      city: "Colombo",
      country: "Sri Lanka",
    },
    passengers: [
      {
        id: "pas_1",
        type: "adult",
        title: "mr",
        givenName: "Tony",
        familyName: "Stark",
        bornOn: "1980-07-24",
        gender: "m",
        identityDocument: null,
      },
    ],
    metadata: [],
    ancillarySelection: {
      services: [],
      metadata: null,
    },
  }
}

function createOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: "off_1",
    owner: {
      id: "air_1",
      iata_code: "QR",
      icao_code: "QTR",
      name: "Qatar Airways",
      logo_symbol_url: null,
      logo_lockup_url: null,
    },
    passengers: [{ id: "pas_1", type: "adult" }],
    available_services: [],
    supported_passenger_identity_document_types: [],
    passenger_identity_documents_required: false,
    payment_requirements: {
      requires_instant_payment: false,
    },
    ...overrides,
  } as unknown as Offer
}

function createDuffelOrder() {
  return {
    id: "ord_1",
    total_amount: "120.00",
    total_currency: "USD",
    payment_status: {
      awaiting_payment: false,
      payment_required_by: null,
      price_guarantee_expires_at: null,
      paid_at: "2026-04-13T10:15:00.000Z",
    },
  } as unknown as Order
}

function createSessionRepository() {
  type SessionCreateInput = Parameters<CheckoutSessionRepository["create"]>[0]
  type SessionUpdatePatch = Parameters<CheckoutSessionRepository["update"]>[1]

  const sessionsById = new Map<string, CheckoutSessionRecord>()
  const sessionsByIdempotency = new Map<string, string>()

  const spies = {
    findByIdempotencyKey: vi.fn(async (idempotencyKey: string) => {
      const id = sessionsByIdempotency.get(idempotencyKey)
      return id ? sessionsById.get(id) ?? null : null
    }),
    findById: vi.fn(async (id: string) => sessionsById.get(id) ?? null),
    findByProviderOrderId: vi.fn(async (providerOrderId: string) => {
      for (const session of sessionsById.values()) {
        if (session.providerOrderId === providerOrderId) {
          return session
        }
      }

      return null
    }),
    create: vi.fn(async (record: SessionCreateInput) => {
      const created: CheckoutSessionRecord = {
        ...record,
        paymentProvider: record.paymentProvider ?? null,
        providerOrderId: record.providerOrderId ?? null,
        providerPaymentId: record.providerPaymentId ?? null,
        providerStatusCode: record.providerStatusCode ?? null,
        providerStatusMessage: record.providerStatusMessage ?? null,
        paymentCurrency: record.paymentCurrency ?? null,
        paymentAmount: record.paymentAmount ?? null,
        fxSourceCurrency: record.fxSourceCurrency ?? null,
        fxTargetCurrency: record.fxTargetCurrency ?? null,
        fxBaseRate: record.fxBaseRate ?? null,
        fxBufferPercent: record.fxBufferPercent ?? null,
        fxEffectiveRate: record.fxEffectiveRate ?? null,
        checkoutPayloadSnapshot: record.checkoutPayloadSnapshot ?? null,
        externalPaymentAuthorizationId: null,
        externalPaymentCaptureId: null,
        duffelOrderId: null,
        paymentInitiatedAt: record.paymentInitiatedAt ?? null,
        paymentConfirmedAt: record.paymentConfirmedAt ?? null,
        finalizedAt: record.finalizedAt ?? null,
        errorCode: null,
        errorMessage: null,
        createdAt: NOW,
        updatedAt: NOW,
      }
      sessionsById.set(record.id, created)
      sessionsByIdempotency.set(record.idempotencyKey, record.id)
      return created
    }),
    update: vi.fn(async (id: string, patch: SessionUpdatePatch) => {
      const existing = sessionsById.get(id)

      if (!existing) {
        return null
      }

      const next = {
        ...existing,
        ...patch,
        updatedAt: NOW,
      }
      sessionsById.set(id, next)
      return next
    }),
  }

  const repo: CheckoutSessionRepository = {
    findByIdempotencyKey: spies.findByIdempotencyKey,
    findById: spies.findById,
    findByProviderOrderId: spies.findByProviderOrderId,
    create: spies.create,
    update: spies.update,
  }

  return {
    repo,
    spies,
  }
}

function createOrderRepository() {
  type CreateOrderInput = Parameters<FlightOrderRepository["create"]>[0]

  const bySessionId = new Map<string, FlightOrderRecord>()

  const spies = {
    findByCheckoutSessionId: vi.fn(async (checkoutSessionId: string) => {
      return bySessionId.get(checkoutSessionId) ?? null
    }),
    create: vi.fn(async (record: CreateOrderInput) => {
      const created: FlightOrderRecord = {
        ...record,
        createdAt: NOW,
        updatedAt: NOW,
      }
      bySessionId.set(record.checkoutSessionId, created)
      return created
    }),
  }

  const repo: FlightOrderRepository = {
    findByCheckoutSessionId: spies.findByCheckoutSessionId,
    create: spies.create,
  }

  return { repo, spies }
}

function createPaymentWebhookEventRepository(): PaymentWebhookEventRepository {
  const eventSet = new Set<string>()

  return {
    async isProcessed(input) {
      return eventSet.has(`${input.provider}:${input.eventKey}`)
    },
    async record(input) {
      eventSet.add(`${input.provider}:${input.eventKey}`)
    },
  }
}
