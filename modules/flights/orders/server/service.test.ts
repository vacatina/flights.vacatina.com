import { expect, test, vi } from "vitest"
import type { FlightOrderRecord } from "@/modules/flights/checkout/server/order-repository"

import { listMyBookings } from "@/modules/flights/orders/server/service"

vi.mock("server-only", () => ({}))

test("listMyBookings applies q/status/sort filters and paginates", async () => {
  const listByOwnerUserId = vi.fn().mockResolvedValue({
    records: [createOrderRecord()],
    total: 1,
  })

  const result = await listMyBookings(
    {
      actor: {
        type: "user",
        clerkUserId: "clerk_1",
        appUserId: "usr_1",
      },
      page: 2,
      pageSize: 5,
      q: "BK-F60F",
      status: "confirmed",
      sort: "amount_high",
    },
    {
      orderRepository: {
        create: vi.fn(),
        findByCheckoutSessionId: vi.fn(),
        findByBookingReference: vi.fn(),
        findByBookingReferenceAndEmailHash: vi.fn(),
        listByOwnerUserId,
      },
      checkoutSessionRepository: {
        findByIdempotencyKey: vi.fn(),
        findById: vi.fn(),
        findByProviderOrderId: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      notificationOutboxRepository: {
        create: vi.fn(),
        findPending: vi.fn(),
        listRecentByFlightOrderId: vi.fn(),
        markSent: vi.fn(),
        markFailed: vi.fn(),
      },
      getDuffelOrderById: vi.fn(),
    }
  )

  expect(listByOwnerUserId).toHaveBeenCalledWith({
    ownerUserId: "usr_1",
    limit: 5,
    offset: 5,
    q: "BK-F60F",
    status: "confirmed",
    sort: "amount_high",
  })
  expect(result.page).toBe(2)
  expect(result.pageSize).toBe(5)
  expect(result.status).toBe("confirmed")
  expect(result.sort).toBe("amount_high")
  expect(result.total).toBe(1)
  expect(result.items[0]?.bookingReference).toBe("BK-F60F36ABAD")
})

test("listMyBookings rejects guest actor", async () => {
  await expect(
    listMyBookings({
      actor: {
        type: "guest",
        guestId: "gst_1",
      },
      page: 1,
      pageSize: 10,
    })
  ).rejects.toThrow("Sign in to view your bookings.")
})

function createOrderRecord(): FlightOrderRecord {
  return {
    id: "fdo_1",
    bookingReference: "BK-F60F36ABAD",
    checkoutSessionId: "chs_1",
    duffelOrderId: "ord_1",
    partialOfferRequestId: "prq_1",
    offerId: "off_1",
    selectedPartialOffers: ["off_1_0"],
    ownerUserId: "usr_1",
    ownerGuestId: null,
    ownerOrgId: null,
    contactEmail: "hashsandbox@gmail.com",
    contactEmailHash: "hash_1",
    paymentMode: "pay_now",
    settlementType: "balance",
    currency: "USD",
    netAmount: 1050,
    sellAmount: 1156.29,
    duffelTotalAmount: 1050,
    duffelTotalCurrency: "USD",
    paymentAwaiting: false,
    paymentRequiredBy: null,
    priceGuaranteeExpiresAt: null,
    paidAt: new Date("2026-04-28T13:04:00.000Z"),
    orderSnapshot: {
      routeLabel: "CMB → DXB · 3 legs",
      journeyTypeLabel: "Multi-city",
      passengerCount: 1,
      legs: [
        {
          ownerName: "Duffel Airways",
          ownerLogoSymbolUrl: null,
          departureAtIso: "2026-04-28T13:04:00.000Z",
          departureLabel: "Mon, 28 Apr 2026, 13:04",
        },
      ],
    },
    createdAt: new Date("2026-04-28T13:04:00.000Z"),
    updatedAt: new Date("2026-04-28T13:04:00.000Z"),
  }
}
