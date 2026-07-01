import { beforeEach, expect, test, vi } from "vitest"
import type { CreateOrder, Offer, Order, SeatMap } from "@duffel/api/types"

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

const paypalMocks = vi.hoisted(() => ({
  createPayPalOrder: vi.fn(),
  getPayPalOrder: vi.fn(),
  capturePayPalOrder: vi.fn(),
}))

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
  createBookingReference: vi.fn(() => "BK-TESTREF001"),
  enqueueNotification: vi.fn(),
  dispatchPendingNotifications: vi.fn(),
  buildFlightOrderSnapshot: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("@/lib/paypal", () => ({
  createPayPalOrder: paypalMocks.createPayPalOrder,
  getPayPalOrder: paypalMocks.getPayPalOrder,
  capturePayPalOrder: paypalMocks.capturePayPalOrder,
  getPayPalCaptureFromOrder: (order: {
    purchase_units?: Array<{ payments?: { captures?: unknown[] } }>
  }) => order.purchase_units?.[0]?.payments?.captures?.[0] ?? null,
  getPayPalCheckoutSessionIdFromResource: (resource: { custom_id?: string } | null) =>
    resource?.custom_id ?? null,
}))

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

vi.mock("@/modules/flights/orders/server/identity", () => ({
  createBookingReference: mockFns.createBookingReference,
  createEmailHash: (value: string) => `hash:${value.toLowerCase()}`,
}))

vi.mock("@/modules/notifications/server", () => ({
  enqueueNotification: mockFns.enqueueNotification,
  dispatchPendingNotifications: mockFns.dispatchPendingNotifications,
}))

vi.mock("@/modules/flights/orders/domain", () => ({
  buildFlightOrderSnapshot: mockFns.buildFlightOrderSnapshot,
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
  captureCheckoutPayPalOrder,
  createCheckoutPayPalOrder,
  fetchCheckoutPageData,
  getCheckoutSessionStatus,
  processPayPalWebhookEvent,
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
  mockFns.enqueueNotification.mockResolvedValue(undefined)
  mockFns.dispatchPendingNotifications.mockResolvedValue({
    scannedCount: 1,
    sentCount: 1,
    failedCount: 0,
  })
  mockFns.buildFlightOrderSnapshot.mockReturnValue({
    schemaVersion: 1,
    routeLabel: "CMB - DXB",
    currency: "USD",
    sellAmount: 120,
    sellAmountLabel: "USD 120.00",
    billingSummary: {
      fareAmountLabel: "USD 100.00",
      taxesAmountLabel: "Included",
      totalAmountLabel: "USD 120.00",
    },
    availableActions: [],
    ticketDocuments: [],
    bookedServices: [],
    metadataEntries: [],
    conditions: {
      changes: "Changes unavailable",
      refunds: "Refunds unavailable",
    },
    legs: [],
    passengers: [],
  })
  mockFns.buildCheckoutPageModel.mockReturnValue(createCheckoutPageModel())

  paypalMocks.createPayPalOrder.mockResolvedValue({
    id: "PAYPAL-ORDER-1",
    status: "CREATED",
  })
  paypalMocks.getPayPalOrder.mockResolvedValue({
    id: "PAYPAL-ORDER-1",
    status: "CREATED",
  })
  paypalMocks.capturePayPalOrder.mockResolvedValue(createCapturedPayPalOrder())
})

test("fetchCheckoutPageData builds PayPal payment preview from sell amount", async () => {
  const result = await fetchCheckoutPageData(createFetchInput(), createDeps())

  expect(result.payment).toEqual({
    provider: "paypal",
    checkoutUi: "buttons",
    paypalEnvironment: "sandbox",
    payNowEnabled: true,
    unavailableReason: null,
    chargeAmount: 120,
    chargeCurrency: "USD",
    chargeAmountLabel: "USD 120.00",
  })
})

test("createCheckoutPayPalOrder creates a PayPal order using sellTotal", async () => {
  const sessionRepo = createSessionRepository()

  const result = await createCheckoutPayPalOrder(
    {
      actor: createGuestActor(),
      payload: createSubmitInput({ paymentMode: "pay_now" }),
    },
    createDeps({ sessionRepository: sessionRepo.repo })
  )

  expect(result).toMatchObject({
    status: "processing",
    paypalOrderId: "PAYPAL-ORDER-1",
    chargeAmount: 120,
    chargeCurrency: "USD",
    chargeAmountLabel: "USD 120.00",
  })
  expect(paypalMocks.createPayPalOrder).toHaveBeenCalledWith(
    expect.objectContaining({
      checkoutSessionId: result.checkoutSessionId,
      amount: 120,
      currency: "USD",
      contactEmail: "guest@example.com",
    })
  )
  expect(sessionRepo.spies.create).toHaveBeenCalledWith(
    expect.objectContaining({
      paymentProvider: "paypal",
      providerOrderId: "PAYPAL-ORDER-1",
      paymentCurrency: "USD",
      paymentAmount: 120,
      paymentMode: "pay_now",
    })
  )
})

test("createCheckoutPayPalOrder reuses an existing processing PayPal order", async () => {
  const sessionRepo = createSessionRepository()

  const first = await createCheckoutPayPalOrder(
    {
      actor: createGuestActor(),
      payload: createSubmitInput({ paymentMode: "pay_now" }),
    },
    createDeps({ sessionRepository: sessionRepo.repo })
  )
  paypalMocks.createPayPalOrder.mockClear()

  const second = await createCheckoutPayPalOrder(
    {
      actor: createGuestActor(),
      payload: createSubmitInput({ paymentMode: "pay_now" }),
    },
    createDeps({ sessionRepository: sessionRepo.repo })
  )

  expect(second.checkoutSessionId).toBe(first.checkoutSessionId)
  expect(second.paypalOrderId).toBe("PAYPAL-ORDER-1")
  expect(paypalMocks.getPayPalOrder).toHaveBeenCalledWith("PAYPAL-ORDER-1")
  expect(paypalMocks.createPayPalOrder).not.toHaveBeenCalled()
})

test("captureCheckoutPayPalOrder finalizes checkout on completed capture", async () => {
  const sessionRepo = createSessionRepository()
  const orderRepo = createOrderRepository()
  const createOrderSpy = vi.fn(async () => createDuffelOrder())
  const session = await createPayNowSession(sessionRepo)

  const result = await captureCheckoutPayPalOrder(
    {
      actor: createGuestActor(),
      checkoutSessionId: session.id,
      paypalOrderId: "PAYPAL-ORDER-1",
    },
    createDeps({
      createOrder: createOrderSpy,
      sessionRepository: sessionRepo.repo,
      orderRepository: orderRepo.repo,
    })
  )

  expect(result.status).toBe("completed")
  const finalizedSession = await sessionRepo.repo.findById(session.id)
  expect(finalizedSession?.status).toBe("completed")
  expect(finalizedSession?.providerPaymentId).toBe("PAYPAL-CAPTURE-1")
  expect(createOrderSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "instant",
      payments: [
        {
          type: "balance",
          amount: "100.00",
          currency: "USD",
        },
      ],
    })
  )
  expect(mockFns.markPricedQuoteConsumed).toHaveBeenCalledWith("pqt_1")
  expect(orderRepo.spies.create).toHaveBeenCalledTimes(1)
})

test("captureCheckoutPayPalOrder marks mismatched payments for reconciliation", async () => {
  const sessionRepo = createSessionRepository()
  const createOrderSpy = vi.fn(async () => createDuffelOrder())
  const session = await createPayNowSession(sessionRepo)
  paypalMocks.capturePayPalOrder.mockResolvedValue(
    createCapturedPayPalOrder({
      value: "119.00",
    })
  )

  const result = await captureCheckoutPayPalOrder(
    {
      actor: createGuestActor(),
      checkoutSessionId: session.id,
      paypalOrderId: "PAYPAL-ORDER-1",
    },
    createDeps({
      createOrder: createOrderSpy,
      sessionRepository: sessionRepo.repo,
    })
  )

  expect(result.status).toBe("reconciliation_required")
  const reconciledSession = await sessionRepo.repo.findById(session.id)
  expect(reconciledSession?.errorCode).toBe("paypal_amount_mismatch")
  expect(createOrderSpy).not.toHaveBeenCalled()
})

test("processPayPalWebhookEvent ignores duplicate completed capture events", async () => {
  const sessionRepo = createSessionRepository()
  const webhookRepo = createPaymentWebhookEventRepository()
  const createOrderSpy = vi.fn(async () => createDuffelOrder())
  await createPayNowSession(sessionRepo)
  const event = createPayPalWebhookEvent("WH-1")
  const deps = createDeps({
    createOrder: createOrderSpy,
    sessionRepository: sessionRepo.repo,
    paymentWebhookEventRepository: webhookRepo,
  })

  await processPayPalWebhookEvent({ event }, deps)
  await processPayPalWebhookEvent({ event }, deps)

  expect(createOrderSpy).toHaveBeenCalledTimes(1)
})

test("submitCheckout keeps the hold flow unchanged", async () => {
  const sessionRepo = createSessionRepository()
  const createOrderSpy = vi.fn(async () => createDuffelOrder())

  const result = await submitCheckout(
    {
      actor: createGuestActor(),
      payload: createSubmitInput({ paymentMode: "hold" }),
    },
    createDeps({
      createOrder: createOrderSpy,
      sessionRepository: sessionRepo.repo,
    })
  )

  expect(result.paymentMode).toBe("hold")
  expect(createOrderSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "pay_later",
    })
  )
  expect(paypalMocks.createPayPalOrder).not.toHaveBeenCalled()
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
    paymentProvider: "paypal",
    providerOrderId: "PAYPAL-ORDER-2",
    providerPaymentId: null,
    providerStatusCode: null,
    providerStatusMessage: null,
    paymentCurrency: "USD",
    paymentAmount: 120,
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
      createDeps({ sessionRepository: sessionRepo.repo })
    )
  ).rejects.toThrow("ownership mismatch")
})

function createFetchInput() {
  return {
    partialOfferRequestId: "prq_1",
    state: {
      offerId: "off_1",
      selectedPartialOffers: ["off_partial_1"],
      quoteId: "pqt_1",
      step: "traveler" as const,
    },
    actor: createGuestActor(),
  }
}

function createDeps(
  overrides: Partial<{
    createOrder: (payload: CreateOrder) => Promise<Order>
    sessionRepository: CheckoutSessionRepository
    orderRepository: FlightOrderRepository
    paymentWebhookEventRepository: PaymentWebhookEventRepository
  }> = {}
) {
  return {
    now: () => NOW,
    getOfferById: async () => createOffer(),
    getSeatMapsByOfferId: async () => [] as SeatMap[],
    createOrder: overrides.createOrder ?? (async () => createDuffelOrder()),
    sessionRepository: overrides.sessionRepository ?? createSessionRepository().repo,
    orderRepository: overrides.orderRepository ?? createOrderRepository().repo,
    paymentWebhookEventRepository:
      overrides.paymentWebhookEventRepository ?? createPaymentWebhookEventRepository(),
  }
}

function createGuestActor() {
  return {
    type: "guest" as const,
    guestId: "gst_1",
  }
}

function createSubmitInput(input: {
  paymentMode: "pay_now" | "hold"
  selectedPartialOffers?: string[]
}): CheckoutSubmitInput {
  return {
    partialOfferRequestId: "prq_1",
    offerId: "off_1",
    quoteId: "pqt_1",
    selectedPartialOffers: input.selectedPartialOffers ?? ["off_partial_1"],
    paymentMode: input.paymentMode,
    contact: {
      email: "guest@example.com",
      phoneNumber: "+94771234567",
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

function createStoredCheckoutSnapshot() {
  return {
    partialOfferRequestId: "prq_1",
    offerId: "off_1",
    quoteId: "pqt_1",
    selectedPartialOffers: ["off_partial_1"],
    contact: {
      email: "guest@example.com",
      phoneNumber: "+94771234567",
    },
    passengers: createSubmitInput({ paymentMode: "pay_now" }).passengers,
    metadata: [],
    ancillarySelection: {
      services: [],
      metadata: null,
    },
    netTotal: 100,
    sourceCurrency: "USD",
  }
}

function createCheckoutPageModel() {
  return {
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
      routeLabel: "CMB - DXB",
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
    payment: {
      provider: "paypal" as const,
      checkoutUi: "buttons" as const,
      paypalEnvironment: "sandbox" as const,
      payNowEnabled: false,
      unavailableReason: null,
      chargeAmount: null,
      chargeCurrency: "USD",
      chargeAmountLabel: null,
    },
  }
}

function createOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: "off_1",
    slices: [
      {
        id: "sli_1",
        origin: {
          iata_code: "CMB",
        },
        destination: {
          iata_code: "DXB",
        },
        duration: "PT4H58M",
        segments: [
          {
            id: "seg_1",
            origin: {
              iata_code: "CMB",
            },
            destination: {
              iata_code: "DXB",
            },
            departing_at: "2026-04-13T10:00:00.000Z",
            arriving_at: "2026-04-13T14:58:00.000Z",
            passengers: [
              {
                passenger_id: "pas_1",
                cabin_class: "economy",
              },
            ],
          },
        ],
      },
    ],
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
    booking_reference: "DUFFELREF",
    payment_status: {
      awaiting_payment: false,
      payment_required_by: null,
      price_guarantee_expires_at: null,
      paid_at: "2026-04-13T10:15:00.000Z",
    },
  } as unknown as Order
}

function createCapturedPayPalOrder(input: { value?: string; status?: string } = {}) {
  return {
    id: "PAYPAL-ORDER-1",
    status: "COMPLETED",
    purchase_units: [
      {
        payments: {
          captures: [
            {
              id: "PAYPAL-CAPTURE-1",
              status: input.status ?? "COMPLETED",
              amount: {
                value: input.value ?? "120.00",
                currency_code: "USD",
              },
            },
          ],
        },
      },
    ],
  }
}

function createPayPalWebhookEvent(id: string) {
  return {
    id,
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: "PAYPAL-CAPTURE-1",
      status: "COMPLETED",
      custom_id: "chs_1",
      amount: {
        value: "120.00",
        currency_code: "USD",
      },
      supplementary_data: {
        related_ids: {
          order_id: "PAYPAL-ORDER-1",
        },
      },
    },
  }
}

async function createPayNowSession(sessionRepo: ReturnType<typeof createSessionRepository>) {
  return sessionRepo.repo.create({
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
    paymentProvider: "paypal",
    providerOrderId: "PAYPAL-ORDER-1",
    providerPaymentId: null,
    providerStatusCode: null,
    providerStatusMessage: null,
    paymentCurrency: "USD",
    paymentAmount: 120,
    checkoutPayloadSnapshot: createStoredCheckoutSnapshot(),
    status: "processing",
    paymentInitiatedAt: NOW,
    paymentConfirmedAt: null,
    finalizedAt: null,
    expiresAt: new Date("2026-04-13T11:00:00.000Z"),
  })
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
    create: vi.fn(async (input: SessionCreateInput) => {
      const record: CheckoutSessionRecord = {
        ...input,
        providerOrderId: input.providerOrderId ?? null,
        providerPaymentId: input.providerPaymentId ?? null,
        providerStatusCode: input.providerStatusCode ?? null,
        providerStatusMessage: input.providerStatusMessage ?? null,
        paymentProvider: input.paymentProvider ?? null,
        paymentCurrency: input.paymentCurrency ?? null,
        paymentAmount: input.paymentAmount ?? null,
        checkoutPayloadSnapshot: input.checkoutPayloadSnapshot ?? null,
        duffelOrderId: null,
        paymentInitiatedAt: input.paymentInitiatedAt ?? null,
        paymentConfirmedAt: input.paymentConfirmedAt ?? null,
        finalizedAt: input.finalizedAt ?? null,
        errorCode: null,
        errorMessage: null,
        createdAt: NOW,
        updatedAt: NOW,
      }
      sessionsById.set(record.id, record)
      sessionsByIdempotency.set(record.idempotencyKey, record.id)
      return record
    }),
    update: vi.fn(async (id: string, patch: SessionUpdatePatch) => {
      const existing = sessionsById.get(id)
      if (!existing) {
        return null
      }
      const updated = {
        ...existing,
        ...patch,
        updatedAt: NOW,
      }
      sessionsById.set(id, updated)
      return updated
    }),
  }

  return {
    repo: spies as CheckoutSessionRepository,
    spies,
  }
}

function createOrderRepository() {
  type OrderCreateInput = Parameters<FlightOrderRepository["create"]>[0]
  const ordersBySession = new Map<string, FlightOrderRecord>()

  const spies = {
    findByCheckoutSessionId: vi.fn(async (checkoutSessionId: string) => {
      return ordersBySession.get(checkoutSessionId) ?? null
    }),
    findByBookingReference: vi.fn(async () => null),
    findByBookingReferenceAndEmailHash: vi.fn(async () => null),
    listByOwnerUserId: vi.fn(async () => ({
      records: [],
      total: 0,
    })),
    create: vi.fn(async (input: OrderCreateInput) => {
      const record: FlightOrderRecord = {
        ...input,
        id: input.id,
        createdAt: NOW,
        updatedAt: NOW,
      }
      ordersBySession.set(record.checkoutSessionId, record)
      return record
    }),
  }

  return {
    repo: spies as FlightOrderRepository,
    spies,
  }
}

function createPaymentWebhookEventRepository(): PaymentWebhookEventRepository {
  const processed = new Set<string>()

  return {
    async isProcessed(input) {
      return processed.has(`${input.provider}:${input.eventKey}`)
    },
    async record(input) {
      processed.add(`${input.provider}:${input.eventKey}`)
    },
  }
}
