import { beforeEach, expect, test, vi } from "vitest"
import type { Offer, Order, SeatMap } from "@duffel/api/types"
import type Stripe from "stripe"

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

const stripeMocks = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(),
  retrieveCheckoutSession: vi.fn(),
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
  getStripeConfig: vi.fn(),
  createBookingReference: vi.fn(() => "BK-TESTREF001"),
  enqueueNotification: vi.fn(),
  dispatchPendingNotifications: vi.fn(),
  buildFlightOrderSnapshot: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    checkout: {
      sessions: {
        create: stripeMocks.createCheckoutSession,
        retrieve: stripeMocks.retrieveCheckoutSession,
      },
    },
  }),
  getStripeConfig: mockFns.getStripeConfig,
  toStripeAmountMinorUnit: (amount: number) => Math.round(amount * 100),
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
  fetchCheckoutPageData,
  getCheckoutSessionStatus,
  processStripeWebhookEvent,
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
  mockFns.getStripeConfig.mockReturnValue({
    secretKey: "sk_test_123",
    webhookSecret: "whsec_test_123",
    appBaseUrl: "https://example.com",
  })
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

  stripeMocks.createCheckoutSession.mockResolvedValue(
    createStripeCheckoutSession({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
      status: "open",
      payment_status: "unpaid",
    })
  )
  stripeMocks.retrieveCheckoutSession.mockResolvedValue(
    createStripeCheckoutSession({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
      status: "open",
      payment_status: "unpaid",
    })
  )
})

test("fetchCheckoutPageData builds Stripe payment preview from sell amount", async () => {
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

  expect(result.payment).toEqual({
    provider: "stripe",
    checkoutUi: "hosted",
    payNowEnabled: true,
    unavailableReason: null,
    chargeAmount: 120,
    chargeCurrency: "USD",
    chargeAmountLabel: "USD 120.00",
  })
})

test("startCheckoutPayment creates a Stripe Checkout session using sellTotal", async () => {
  const sessionRepo = createSessionRepository()

  const result = await startCheckoutPayment(
    {
      actor: {
        type: "guest",
        guestId: "gst_1",
      },
      payload: createSubmitInput({ paymentMode: "pay_now" }),
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

  expect(result).toMatchObject({
    status: "processing",
    redirectUrl: "https://checkout.stripe.com/c/pay/cs_test_1",
    chargeAmount: 120,
    chargeCurrency: "USD",
    chargeAmountLabel: "USD 120.00",
  })

  expect(stripeMocks.createCheckoutSession).toHaveBeenCalledWith(
    expect.objectContaining({
      mode: "payment",
      payment_method_types: ["card"],
      currency: "usd",
      customer_email: "guest@example.com",
      client_reference_id: result.checkoutSessionId,
      success_url:
        `https://example.com/results/prq_1/checkout?offer=off_1&selected=off_partial_1&quote=pqt_1&step=pay&status=processing&session=${result.checkoutSessionId}`,
      cancel_url:
        `https://example.com/results/prq_1/checkout?offer=off_1&selected=off_partial_1&quote=pqt_1&step=pay&session=${result.checkoutSessionId}&cancelled=1`,
      line_items: [
        expect.objectContaining({
          quantity: 1,
          price_data: expect.objectContaining({
            currency: "usd",
            unit_amount: 12000,
          }),
        }),
      ],
    })
  )

  const createdRecord = sessionRepo.spies.create.mock.calls[0]?.[0]
  expect(createdRecord).toMatchObject({
    paymentProvider: "stripe",
    paymentCurrency: "USD",
    paymentAmount: 120,
    paymentMode: "pay_now",
    netAmount: 100,
    sellAmount: 120,
  })
})

test("startCheckoutPayment reuses an open Stripe Checkout session", async () => {
  const sessionRepo = createSessionRepository()

  await startCheckoutPayment(
    {
      actor: {
        type: "guest",
        guestId: "gst_1",
      },
      payload: createSubmitInput({ paymentMode: "pay_now" }),
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

  stripeMocks.createCheckoutSession.mockClear()
  stripeMocks.retrieveCheckoutSession.mockResolvedValue(
    createStripeCheckoutSession({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_existing",
      status: "open",
      payment_status: "unpaid",
    })
  )

  const result = await startCheckoutPayment(
    {
      actor: {
        type: "guest",
        guestId: "gst_1",
      },
      payload: createSubmitInput({ paymentMode: "pay_now" }),
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

  expect(result.redirectUrl).toBe("https://checkout.stripe.com/c/pay/cs_existing")
  expect(stripeMocks.retrieveCheckoutSession).toHaveBeenCalledWith("cs_test_1")
  expect(stripeMocks.createCheckoutSession).not.toHaveBeenCalled()
})

test("startCheckoutPayment recreates an expired Stripe Checkout session", async () => {
  const sessionRepo = createSessionRepository()

  await startCheckoutPayment(
    {
      actor: {
        type: "guest",
        guestId: "gst_1",
      },
      payload: createSubmitInput({ paymentMode: "pay_now" }),
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

  stripeMocks.retrieveCheckoutSession.mockResolvedValue(
    createStripeCheckoutSession({
      id: "cs_test_1",
      url: null,
      status: "expired",
      payment_status: "unpaid",
    })
  )
  stripeMocks.createCheckoutSession.mockResolvedValue(
    createStripeCheckoutSession({
      id: "cs_test_2",
      url: "https://checkout.stripe.com/c/pay/cs_test_2",
      status: "open",
      payment_status: "unpaid",
    })
  )

  const result = await startCheckoutPayment(
    {
      actor: {
        type: "guest",
        guestId: "gst_1",
      },
      payload: createSubmitInput({ paymentMode: "pay_now" }),
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

  expect(result.redirectUrl).toBe("https://checkout.stripe.com/c/pay/cs_test_2")
  expect(sessionRepo.spies.update).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      status: "processing",
      providerOrderId: "cs_test_2",
      providerStatusCode: "open",
      providerStatusMessage: "unpaid",
    })
  )
})

test("startCheckoutPayment retries sessions failed by stripe expiration and refreshes contact snapshot", async () => {
  const sessionRepo = createSessionRepository()
  const originalPayload = {
    ...createSubmitInput({ paymentMode: "pay_now" }),
    passengers: [
      {
        id: "pas_1",
        type: "adult" as const,
        title: "mr" as const,
        givenName: "Tony",
        familyName: "Stark",
        bornOn: "1980-07-24",
        gender: "m" as const,
        email: "traveler@example.com",
        phoneNumber: "+94770000000",
        identityDocument: null,
      },
    ],
  }

  const initialResult = await startCheckoutPayment(
    {
      actor: {
        type: "guest",
        guestId: "gst_1",
      },
      payload: originalPayload,
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

  await sessionRepo.repo.update(initialResult.checkoutSessionId, {
    status: "failed",
    errorCode: "stripe_checkout_expired",
    errorMessage: "Stripe checkout session expired before payment was completed.",
  })
  sessionRepo.spies.update.mockClear()

  stripeMocks.retrieveCheckoutSession.mockResolvedValue(
    createStripeCheckoutSession({
      id: "cs_test_1",
      url: null,
      status: "expired",
      payment_status: "unpaid",
    })
  )
  stripeMocks.createCheckoutSession.mockResolvedValue(
    createStripeCheckoutSession({
      id: "cs_test_3",
      url: "https://checkout.stripe.com/c/pay/cs_test_3",
      status: "open",
      payment_status: "unpaid",
    })
  )

  const result = await startCheckoutPayment(
    {
      actor: {
        type: "guest",
        guestId: "gst_1",
      },
      payload: {
        ...originalPayload,
        contact: {
          email: "updated@example.com",
          phoneNumber: "+94770000001",
        },
      },
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

  expect(result.redirectUrl).toBe("https://checkout.stripe.com/c/pay/cs_test_3")
  expect(sessionRepo.spies.update).toHaveBeenCalledWith(
    initialResult.checkoutSessionId,
    expect.objectContaining({
      status: "processing",
      errorCode: null,
      errorMessage: null,
      providerOrderId: "cs_test_3",
      providerStatusCode: "open",
      providerStatusMessage: "unpaid",
      checkoutPayloadSnapshot: expect.objectContaining({
        contact: {
          email: "updated@example.com",
          phoneNumber: "+94770000001",
        },
      }),
    })
  )

  const refreshedSession = await sessionRepo.repo.findById(initialResult.checkoutSessionId)
  expect(refreshedSession?.status).toBe("processing")
  expect(refreshedSession?.errorCode).toBeNull()
  expect(refreshedSession?.errorMessage).toBeNull()
  expect(refreshedSession?.providerOrderId).toBe("cs_test_3")
  expect(refreshedSession?.checkoutPayloadSnapshot).toMatchObject({
    contact: {
      email: "updated@example.com",
      phoneNumber: "+94770000001",
    },
  })
})

test("submitCheckout keeps the hold flow unchanged", async () => {
  const sessionRepo = createSessionRepository()
  const createOrderSpy = vi.fn(async () => createDuffelOrder())

  const result = await submitCheckout(
    {
      actor: {
        type: "guest",
        guestId: "gst_1",
      },
      payload: createSubmitInput({ paymentMode: "hold" }),
    },
    {
      now: () => NOW,
      getOfferById: async () => createOffer(),
      getSeatMapsByOfferId: async () => [] as SeatMap[],
      createOrder: createOrderSpy,
      sessionRepository: sessionRepo.repo,
      orderRepository: createOrderRepository().repo,
      paymentWebhookEventRepository: createPaymentWebhookEventRepository(),
    }
  )

  expect(result.paymentMode).toBe("hold")
  expect(createOrderSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "pay_later",
    })
  )
  expect(stripeMocks.createCheckoutSession).not.toHaveBeenCalled()
})

test("processStripeWebhookEvent finalizes checkout on paid completion", async () => {
  const sessionRepo = createSessionRepository()
  const orderRepo = createOrderRepository()
  const createOrderSpy = vi.fn(async () => createDuffelOrder())

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
    paymentProvider: "stripe",
    providerOrderId: "cs_test_1",
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

  await processStripeWebhookEvent(
    {
      event: createStripeEvent({
        id: "evt_1",
        type: "checkout.session.completed",
        session: createStripeCheckoutSession({
          id: "cs_test_1",
          url: "https://checkout.stripe.com/c/pay/cs_test_1",
          status: "complete",
          payment_status: "paid",
          client_reference_id: createdSession.id,
          payment_intent: "pi_1",
          amount_total: 12000,
          currency: "usd",
          metadata: {
            checkout_session_id: createdSession.id,
          },
        }),
      }),
    },
    {
      now: () => NOW,
      getOfferById: async () => createOffer(),
      getSeatMapsByOfferId: async () => [] as SeatMap[],
      createOrder: createOrderSpy,
      sessionRepository: sessionRepo.repo,
      orderRepository: orderRepo.repo,
      paymentWebhookEventRepository: createPaymentWebhookEventRepository(),
    }
  )

  const finalizedSession = await sessionRepo.repo.findById(createdSession.id)
  expect(finalizedSession?.status).toBe("completed")
  expect(finalizedSession?.providerPaymentId).toBe("pi_1")
  expect(finalizedSession?.checkoutPayloadSnapshot).toMatchObject({
    snapshotType: "checkout_terminal_summary",
    paymentMode: "pay_now",
  })
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

test("processStripeWebhookEvent ignores duplicate events", async () => {
  const sessionRepo = createSessionRepository()
  const orderRepo = createOrderRepository()
  const webhookRepo = createPaymentWebhookEventRepository()
  const createOrderSpy = vi.fn(async () => createDuffelOrder())

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
    paymentProvider: "stripe",
    providerOrderId: "cs_test_1",
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

  const event = createStripeEvent({
    id: "evt_duplicate_1",
    type: "checkout.session.completed",
    session: createStripeCheckoutSession({
      id: "cs_test_1",
      status: "complete",
      payment_status: "paid",
      client_reference_id: createdSession.id,
      payment_intent: "pi_duplicate_1",
      amount_total: 12000,
      currency: "usd",
      metadata: {
        checkout_session_id: createdSession.id,
      },
    }),
  })

  const deps = {
    now: () => NOW,
    getOfferById: async () => createOffer(),
    getSeatMapsByOfferId: async () => [] as SeatMap[],
    createOrder: createOrderSpy,
    sessionRepository: sessionRepo.repo,
    orderRepository: orderRepo.repo,
    paymentWebhookEventRepository: webhookRepo,
  }

  await processStripeWebhookEvent({ event }, deps)
  await processStripeWebhookEvent({ event }, deps)

  expect(createOrderSpy).toHaveBeenCalledTimes(1)
})

test("processStripeWebhookEvent marks mismatched payments for reconciliation", async () => {
  const sessionRepo = createSessionRepository()
  const createOrderSpy = vi.fn(async () => createDuffelOrder())

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
    paymentProvider: "stripe",
    providerOrderId: "cs_test_1",
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

  await processStripeWebhookEvent(
    {
      event: createStripeEvent({
        id: "evt_mismatch_1",
        type: "checkout.session.completed",
        session: createStripeCheckoutSession({
          id: "cs_test_1",
          status: "complete",
          payment_status: "paid",
          client_reference_id: createdSession.id,
          payment_intent: "pi_mismatch_1",
          amount_total: 11900,
          currency: "usd",
          metadata: {
            checkout_session_id: createdSession.id,
          },
        }),
      }),
    },
    {
      now: () => NOW,
      getOfferById: async () => createOffer(),
      getSeatMapsByOfferId: async () => [] as SeatMap[],
      createOrder: createOrderSpy,
      sessionRepository: sessionRepo.repo,
      orderRepository: createOrderRepository().repo,
      paymentWebhookEventRepository: createPaymentWebhookEventRepository(),
    }
  )

  const reconciledSession = await sessionRepo.repo.findById(createdSession.id)
  expect(reconciledSession?.status).toBe("reconciliation_required")
  expect(reconciledSession?.errorCode).toBe("stripe_amount_mismatch")
  expect(createOrderSpy).not.toHaveBeenCalled()
})

test("processStripeWebhookEvent marks expired Stripe sessions as failed", async () => {
  const sessionRepo = createSessionRepository()

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
    paymentProvider: "stripe",
    providerOrderId: "cs_test_1",
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

  await processStripeWebhookEvent(
    {
      event: createStripeEvent({
        id: "evt_expired_1",
        type: "checkout.session.expired",
        session: createStripeCheckoutSession({
          id: "cs_test_1",
          status: "expired",
          payment_status: "unpaid",
          client_reference_id: createdSession.id,
          metadata: {
            checkout_session_id: createdSession.id,
          },
        }),
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

  const failedSession = await sessionRepo.repo.findById(createdSession.id)
  expect(failedSession?.status).toBe("failed")
  expect(failedSession?.errorCode).toBe("stripe_checkout_expired")
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
    paymentProvider: "stripe",
    providerOrderId: "cs_test_2",
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
    payment: {
      provider: "stripe" as const,
      checkoutUi: "hosted" as const,
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

function createStripeCheckoutSession(
  overrides: Partial<Stripe.Checkout.Session>
): Stripe.Checkout.Session {
  return {
    id: "cs_test_default",
    object: "checkout.session",
    url: "https://checkout.stripe.com/c/pay/cs_test_default",
    status: "open",
    payment_status: "unpaid",
    client_reference_id: null,
    payment_intent: null,
    amount_total: 12000,
    currency: "usd",
    metadata: {},
    ...overrides,
  } as Stripe.Checkout.Session
}

function createStripeEvent(input: {
  id: string
  type: Stripe.Event.Type
  session: Stripe.Checkout.Session
}): Stripe.Event {
  return {
    id: input.id,
    object: "event",
    type: input.type,
    data: {
      object: input.session,
    },
  } as Stripe.Event
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
        checkoutPayloadSnapshot: record.checkoutPayloadSnapshot ?? null,
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
  const byBookingReference = new Map<string, FlightOrderRecord>()

  const spies = {
    findByCheckoutSessionId: vi.fn(async (checkoutSessionId: string) => {
      return bySessionId.get(checkoutSessionId) ?? null
    }),
    findByBookingReference: vi.fn(async (bookingReference: string) => {
      return byBookingReference.get(bookingReference) ?? null
    }),
    findByBookingReferenceAndEmailHash: vi.fn(
      async (bookingReference: string, contactEmailHash: string) => {
        const order = byBookingReference.get(bookingReference) ?? null
        if (!order) {
          return null
        }
        return order.contactEmailHash === contactEmailHash ? order : null
      }
    ),
    listByOwnerUserId: vi.fn(
      async (input: { ownerUserId: string; limit: number; offset: number }) => {
        const records = Array.from(bySessionId.values())
          .filter((record) => record.ownerUserId === input.ownerUserId)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        return {
          records: records.slice(input.offset, input.offset + input.limit),
          total: records.length,
        }
      }
    ),
    create: vi.fn(async (record: CreateOrderInput) => {
      const created: FlightOrderRecord = {
        ...record,
        createdAt: NOW,
        updatedAt: NOW,
      }
      bySessionId.set(record.checkoutSessionId, created)
      byBookingReference.set(record.bookingReference, created)
      return created
    }),
  }

  const repo: FlightOrderRepository = {
    findByCheckoutSessionId: spies.findByCheckoutSessionId,
    findByBookingReference: spies.findByBookingReference,
    findByBookingReferenceAndEmailHash: spies.findByBookingReferenceAndEmailHash,
    listByOwnerUserId: spies.listByOwnerUserId,
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
