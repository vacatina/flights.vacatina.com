import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import type { AuthenticatedActorContext } from "@/modules/auth/types"
import {
  isActiveAdminMetadata,
  type AdminActor,
} from "@/modules/flights/cancellations/server/admin-guard"
import {
  approveCancellation,
  createCancellationRequest,
  getCancellationEligibilityContext,
  listAdminCancellationRequests,
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
