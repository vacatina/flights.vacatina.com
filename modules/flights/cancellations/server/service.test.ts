import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import type { AuthenticatedActorContext } from "@/modules/auth/types"
import {
  isActiveAdminMetadata,
  type AdminActor,
} from "@/modules/flights/cancellations/server/admin-guard"
import {
  approveCancellation,
  approveRefund,
  createOrRefreshDuffelCancellationQuote,
  createCancellationRequest,
  getAdminCancellationDetail,
  getCancellationEligibilityContext,
  listAdminCancellationRequests,
  markManualRefundCompleted,
  rejectCancellation,
  updateBusinessSettings,
  type CancellationServiceDeps,
} from "@/modules/flights/cancellations/server/service"
import {
  defaultCancellationRepository,
  resetCancellationRepositoryInMemoryStateForTests,
} from "@/modules/flights/cancellations/server/repository"
import {
  defaultFlightOrderRepository,
  resetInMemoryFlightOrdersForTests,
} from "@/modules/flights/checkout/server/order-repository"
import {
  defaultCheckoutSessionRepository,
  resetInMemoryCheckoutSessionsForTests,
} from "@/modules/flights/checkout/server/session-repository"

const actor: AuthenticatedActorContext = {
  type: "user",
  clerkUserId: "clerk_user_1",
  appUserId: "usr_1",
}

const admin: AdminActor = {
  clerkUserId: "clerk_admin_1",
  appUserId: "usr_admin_1",
  email: "admin@example.com",
}

describe("flight cancellation service", () => {
  beforeEach(async () => {
    resetCancellationRepositoryInMemoryStateForTests()
    resetInMemoryFlightOrdersForTests()
    resetInMemoryCheckoutSessionsForTests()
    await createTestOrder()
  })

  test("creates a customer full-booking cancellation request", async () => {
    const request = await createCancellationRequest(
      {
        actor,
        bookingReference: "VAC123",
        customerReason:
          "My travel dates changed and I need the entire booking cancelled.",
      },
      createDeps(new Date("2026-07-31T10:00:00.000Z"))
    )

    expect(request.status).toBe("requested")
    expect(request.customerRefundAmount).toBe(500)
    expect(request.adminFeeAmount).toBe(0)

    const queue = await listAdminCancellationRequests()
    expect(queue).toHaveLength(1)
    expect(queue[0]?.bookingReference).toBe("VAC123")
  })

  test("prevents duplicate active cancellation requests", async () => {
    await createCancellationRequest(
      {
        actor,
        bookingReference: "VAC123",
        customerReason:
          "My travel dates changed and I need the entire booking cancelled.",
      },
      createDeps(new Date("2026-07-31T10:00:00.000Z"))
    )

    await expect(
      createCancellationRequest(
        {
          actor,
          bookingReference: "VAC123",
          customerReason:
            "Submitting a second active request should not be allowed.",
        },
        createDeps(new Date("2026-07-31T10:01:00.000Z"))
      )
    ).rejects.toThrow("already open")
  })

  test("enforces rejected-request cooldown before resubmission", async () => {
    const deps = createDeps(new Date("2026-07-31T10:00:00.000Z"))
    const request = await createCancellationRequest(
      {
        actor,
        bookingReference: "VAC123",
        customerReason:
          "My travel dates changed and I need the entire booking cancelled.",
      },
      deps
    )
    await rejectCancellation(
      {
        requestId: request.id,
        admin,
        reason: "Airline rules do not allow this cancellation right now.",
      },
      deps
    )

    await expect(
      createCancellationRequest(
        {
          actor,
          bookingReference: "VAC123",
          customerReason:
            "Trying again before the rejection cooldown has elapsed.",
        },
        createDeps(new Date("2026-07-31T10:05:00.000Z"))
      )
    ).rejects.toThrow("Please wait")

    const context = await getCancellationEligibilityContext(
      {
        actor,
        bookingReference: "VAC123",
      },
      createDeps(new Date("2026-07-31T10:11:00.000Z"))
    )
    expect(context.canSubmit).toBe(true)
  })

  test("supports admin approval status transition", async () => {
    const request = await createCancellationRequest(
      {
        actor,
        bookingReference: "VAC123",
        customerReason:
          "My travel dates changed and I need the entire booking cancelled.",
      },
      createDeps(new Date("2026-07-31T10:00:00.000Z"))
    )

    const approved = await approveCancellation(
      {
        requestId: request.id,
        admin,
      },
      createDeps(new Date("2026-07-31T10:02:00.000Z"))
    )

    expect(approved.status).toBe("refund_pending")
  })

  test("persists Duffel cancellation quotes and notifies active admins", async () => {
    const deps = createDeps(new Date("2026-07-31T10:00:00.000Z"))
    const adminRecipients = vi.fn(async () => [
      { id: "clerk_admin_1", email: "admin@example.com" },
    ])
    deps.listAdminAlertRecipients = adminRecipients
    const request = await createCancellationRequest(
      {
        actor,
        bookingReference: "VAC123",
        customerReason:
          "My travel dates changed and I need the entire booking cancelled.",
      },
      deps
    )

    const quoted = await createOrRefreshDuffelCancellationQuote(
      { requestId: request.id, admin },
      deps
    )
    const detail = await getAdminCancellationDetail(request.id, deps)

    expect(quoted.status).toBe("quote_ready")
    expect(detail.quotes[0]?.duffelOrderCancellationId).toBe("ore_1")
    expect(adminRecipients).toHaveBeenCalled()
    expect(deps.enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: "admin@example.com",
      })
    )
  })

  test("moves to manual processing when Duffel cancel action is unavailable", async () => {
    const deps = createDeps(new Date("2026-07-31T10:00:00.000Z"))
    deps.duffelService.getOrder = vi.fn(async () => ({
      id: "ord_1",
      availableActions: ["change"],
      rawPayload: { id: "ord_1", available_actions: ["change"] } as never,
    }))
    const request = await createCancellationRequest(
      {
        actor,
        bookingReference: "VAC123",
        customerReason:
          "My travel dates changed and I need the entire booking cancelled.",
      },
      deps
    )

    const updated = await createOrRefreshDuffelCancellationQuote(
      { requestId: request.id, admin },
      deps
    )

    expect(updated.status).toBe("manual_processing")
  })

  test("keeps request actionable when Duffel confirmation fails", async () => {
    const deps = createDeps(new Date("2026-07-31T10:00:00.000Z"))
    deps.duffelService.confirmCancellationQuote = vi.fn(async () => {
      throw new Error("stale cancellation quote")
    })
    const request = await createCancellationRequest(
      {
        actor,
        bookingReference: "VAC123",
        customerReason:
          "My travel dates changed and I need the entire booking cancelled.",
      },
      deps
    )

    const updated = await approveCancellation(
      { requestId: request.id, admin },
      deps
    )

    expect(updated.status).toBe("manual_processing")
  })

  test("caps PayPal refunds at the captured payment amount", async () => {
    const deps = createDeps(new Date("2026-07-31T10:00:00.000Z"))
    const refundProvider = vi.fn(async () => ({
      id: "paypal_refund_1",
      status: "COMPLETED",
    }))
    deps.refundProvider = refundProvider
    const request = await deps.cancellationRepository.createRequest({
      flightOrderId: "flo_paid",
      bookingReference: "VACPAID",
      duffelOrderId: "ord_paid",
      requestedByUserId: actor.appUserId,
      requestedByGuestId: null,
      customerReason:
        "My travel dates changed and I need the entire booking cancelled.",
      duffelApiAvailable: true,
      adminFeeType: "none",
      adminFeeValue: 0,
      adminFeeAmount: 0,
      customerRefundAmount: 900,
      customerRefundCurrency: "USD",
      customerMessage: null,
      status: "refund_pending",
    })
    const originalGetDetail = deps.cancellationRepository.getDetail
    deps.cancellationRepository.getDetail = vi.fn(async () => ({
      request,
      order: {
        id: "flo_paid",
        checkoutSessionId: "chk_paid",
        duffelOrderId: "ord_paid",
        partialOfferRequestId: "por_paid",
        offerId: "off_paid",
        selectedPartialOffers: [],
        ownerUserId: actor.appUserId,
        ownerGuestId: null,
        ownerOrgId: null,
        contactEmail: "customer@example.com",
        contactEmailHash: "hash",
        paymentMode: "pay_now" as const,
        settlementType: "balance" as const,
        netAmount: "800",
        duffelTotalAmount: "800",
        duffelTotalCurrency: "USD",
        paymentAwaiting: false,
        paymentRequiredBy: null,
        priceGuaranteeExpiresAt: null,
        paidAt: new Date("2026-07-30T10:00:00.000Z"),
        orderSnapshot: {
          routeLabel: "JFK - LAX",
        },
        createdAt: new Date("2026-07-30T10:00:00.000Z"),
        updatedAt: new Date("2026-07-30T10:00:00.000Z"),
        bookingReference: "VACPAID",
        paymentAttemptId: "pay_1",
        sellAmount: "900",
        currency: "USD",
      },
      paymentAttempt: {
        id: "pay_1",
        internalOrderType: "flight_checkout" as const,
        internalOrderId: "chk_paid",
        ownerUserId: actor.appUserId,
        ownerGuestId: null,
        ownerOrgId: null,
        provider: "paypal" as const,
        status: "capture_completed" as const,
        currency: "USD",
        amount: "500.0000",
        providerOrderId: "paypal_order_1",
        providerCaptureId: "capture_1",
        providerStatus: "COMPLETED",
        createIdempotencyKey: "create",
        captureIdempotencyKey: "capture",
        clientIdempotencyKey: "client",
        checkoutPayloadSnapshot: null,
        lastProviderPayload: null,
        failureCode: null,
        failureMessage: null,
        reconciliationRequiredAt: null,
        nextReconciliationAt: null,
        createdAt: new Date("2026-07-30T10:00:00.000Z"),
        updatedAt: new Date("2026-07-30T10:00:00.000Z"),
      },
      quotes: [],
      refunds: [],
      events: [],
    }))

    try {
      await approveRefund({ requestId: request.id, admin }, deps)
    } finally {
      deps.cancellationRepository.getDetail = originalGetDetail
    }

    expect(refundProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 500,
        captureId: "capture_1",
        idempotencyKey: `flight-cancellation-refund:${request.id}`,
      })
    )
  })

  test("keeps refunds manual and idempotent when the PayPal capture is missing", async () => {
    const deps = createDeps(new Date("2026-07-31T10:00:00.000Z"))
    const refundProvider = vi.fn()
    deps.refundProvider = refundProvider
    const request = await deps.cancellationRepository.createRequest({
      flightOrderId: "flo_manual",
      bookingReference: "VACMANUAL",
      duffelOrderId: "ord_manual",
      requestedByUserId: actor.appUserId,
      requestedByGuestId: null,
      customerReason:
        "My travel dates changed and I need the entire booking cancelled.",
      duffelApiAvailable: true,
      adminFeeType: "fixed",
      adminFeeValue: 25,
      adminFeeAmount: 25,
      customerRefundAmount: 250,
      customerRefundCurrency: "USD",
      customerMessage: null,
      status: "refund_pending",
    })

    const firstApproval = await approveRefund(
      { requestId: request.id, admin },
      deps
    )
    const secondApproval = await approveRefund(
      { requestId: request.id, admin },
      deps
    )
    const detail = await deps.cancellationRepository.getDetail(request.id)

    expect(firstApproval.status).toBe("manual_processing")
    expect(secondApproval.status).toBe("manual_processing")
    expect(refundProvider).not.toHaveBeenCalled()
    expect(detail?.refunds).toHaveLength(1)
    expect(detail?.refunds[0]?.status).toBe("approved")
  })

  test("allows manual refund completion after PayPal fallback", async () => {
    const deps = createDeps(new Date("2026-07-31T10:00:00.000Z"))
    const request = await deps.cancellationRepository.createRequest({
      flightOrderId: "flo_manual_2",
      bookingReference: "VACMANUAL2",
      duffelOrderId: "ord_manual_2",
      requestedByUserId: actor.appUserId,
      requestedByGuestId: null,
      customerReason:
        "My travel dates changed and I need the entire booking cancelled.",
      duffelApiAvailable: true,
      adminFeeType: "none",
      adminFeeValue: 0,
      adminFeeAmount: 0,
      customerRefundAmount: 250,
      customerRefundCurrency: "USD",
      customerMessage: null,
      status: "manual_processing",
    })

    const completed = await markManualRefundCompleted(
      { requestId: request.id, admin },
      deps
    )

    expect(completed.status).toBe("completed")
  })

  test("updates business settings from admin input", async () => {
    const settings = await updateBusinessSettings(
      {
        admin,
        businessName: "Vacatina Ops",
        supportEmail: "ops@example.com",
        supportPhone: "+1 555 0100",
        supportWhatsapp: "+1 555 0101",
        address: "123 Support Street",
        timezone: "America/New_York",
      },
      createDeps(new Date("2026-07-31T10:00:00.000Z"))
    )

    expect(settings.businessName).toBe("Vacatina Ops")
    expect(settings.updatedBy).toBe(admin.appUserId)
  })

  test("checks Clerk admin metadata requirements", () => {
    expect(isActiveAdminMetadata({ role: "admin", status: "active" })).toBe(
      true
    )
    expect(isActiveAdminMetadata({ role: "admin", status: "suspended" })).toBe(
      false
    )
    expect(isActiveAdminMetadata({ role: "customer", status: "active" })).toBe(
      false
    )
  })
})

function createDeps(now: Date): CancellationServiceDeps {
  return {
    cancellationRepository: defaultCancellationRepository,
    orderRepository: defaultFlightOrderRepository,
    checkoutSessionRepository: defaultCheckoutSessionRepository,
    config: {
      rejectionCooldownMinutes: 10,
      defaultFeeType: "none",
      defaultFeeValue: 0,
    },
    now: () => now,
    duffelService: {
      getOrder: vi.fn(async () => ({
        id: "ord_1",
        availableActions: ["cancel"],
        rawPayload: { id: "ord_1", available_actions: ["cancel"] } as never,
      })),
      createCancellationQuote: vi.fn(async () => ({
        id: "ore_1",
        refundAmount: 500,
        refundCurrency: "USD",
        refundTo: "balance",
        expiresAt: new Date("2026-07-31T11:00:00.000Z"),
        confirmedAt: null,
        rawPayload: {
          id: "ore_1",
          refund_amount: "500.00",
          refund_currency: "USD",
          refund_to: "balance",
        } as never,
      })),
      confirmCancellationQuote: vi.fn(async () => ({
        id: "ore_1",
        refundAmount: 500,
        refundCurrency: "USD",
        refundTo: "balance",
        expiresAt: new Date("2026-07-31T11:00:00.000Z"),
        confirmedAt: now,
        rawPayload: {
          id: "ore_1",
          refund_amount: "500.00",
          refund_currency: "USD",
          refund_to: "balance",
          confirmed_at: now.toISOString(),
        } as never,
      })),
    },
    refundProvider: vi.fn(async () => ({
      id: "paypal_refund_1",
      status: "COMPLETED",
    })),
    refreshPaymentCapture: vi.fn(async () => undefined),
    enqueueNotification: vi.fn(async (input) => ({
      id: `not_${input.eventType}`,
      eventType: input.eventType,
      status: "pending" as const,
      flightOrderId: input.flightOrderId,
      checkoutSessionId: input.checkoutSessionId,
      bookingReference: input.bookingReference,
      recipientEmail: input.recipientEmail,
      recipientEmailHash: input.recipientEmailHash,
      payload: input.payload,
      attemptCount: 0,
      lastError: null,
      sentAt: null,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    })),
    listAdminAlertRecipients: vi.fn(async () => []),
  }
}

async function createTestOrder() {
  await defaultFlightOrderRepository.create({
    id: "flo_1",
    bookingReference: "VAC123",
    checkoutSessionId: "chk_1",
    duffelOrderId: "ord_1",
    partialOfferRequestId: "por_1",
    offerId: "off_1",
    selectedPartialOffers: ["po_1"],
    ownerUserId: actor.appUserId,
    ownerGuestId: null,
    ownerOrgId: null,
    contactEmail: "customer@example.com",
    contactEmailHash: "hash",
    paymentMode: "pay_now",
    settlementType: "balance",
    currency: "USD",
    netAmount: 400,
    sellAmount: 500,
    duffelTotalAmount: 400,
    duffelTotalCurrency: "USD",
    paymentAwaiting: false,
    paymentRequiredBy: null,
    priceGuaranteeExpiresAt: null,
    paidAt: new Date("2026-07-30T10:00:00.000Z"),
    orderSnapshot: {
      schemaVersion: 1,
      journeyTypeLabel: "One-way",
      routeLabel: "JFK - LAX",
      passengerCount: 1,
      cabinClassLabel: "Economy",
      currency: "USD",
      sellAmount: 500,
      sellAmountLabel: "$500.00",
      createdAtIso: "2026-07-30T10:00:00.000Z",
      airlineBookingReference: "ABC123",
      availableActions: ["cancel"],
      ticketDocuments: [],
      bookedServices: [],
      metadataEntries: [],
      conditions: {
        changes: "Changes allowed",
        refunds: "Refunds allowed",
      },
      legs: [
        {
          legIndex: 0,
          title: "Selected flight",
          ownerName: "Test Air",
          ownerLogoSymbolUrl: null,
          departureIata: "JFK",
          arrivalIata: "LAX",
          routeLabel: "JFK - LAX",
          subtitle: "Economy",
          departureTimeLabel: "12:00",
          arrivalTimeLabel: "15:00",
          departureAtIso: "2026-08-01T12:00:00.000Z",
          arrivalAtIso: "2026-08-01T15:00:00.000Z",
          departureLabel: "Sat, 1 Aug 2026, 12:00",
          arrivalLabel: "Sat, 1 Aug 2026, 15:00",
          durationLabel: "03h 00m",
          stopsLabel: "Non-stop",
          stopsDetails: "JFK - LAX",
          timeline: [],
          layovers: [],
        },
      ],
      passengers: [
        {
          id: "pas_1",
          label: "Adult 1",
          typeLabel: "Adult",
          fullName: "Taylor Example",
          dateOfBirthLabel: null,
          genderLabel: null,
          email: "customer@example.com",
          phoneNumber: null,
        },
      ],
      billingSummary: {
        fareAmountLabel: "$400.00",
        taxesAmountLabel: "$100.00",
        totalAmountLabel: "$500.00",
      },
    },
  })
}
