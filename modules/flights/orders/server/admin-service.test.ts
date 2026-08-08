import { expect, test, vi } from "vitest"

import type { FlightOrderRecord } from "@/modules/flights/checkout/server/order-repository"
import { listAdminBookings } from "@/modules/flights/orders/server/admin-service"

vi.mock("server-only", () => ({}))

test("listAdminBookings maps operational cancellation state and paginates", async () => {
  const order = createOrderRecord()
  const listOrders = vi.fn().mockResolvedValue({
    records: [
      {
        order,
        cancellationStatus: "completed",
        cancellationRequestId: "fcr_1",
      },
    ],
    total: 23,
  })

  const result = await listAdminBookings(
    {
      page: 2,
      pageSize: 20,
      q: "customer@example.com",
      status: "cancelled",
      sort: "newest",
    },
    {
      listOrders,
      orderRepository: { findByBookingReference: vi.fn() },
      checkoutSessionRepository: { findById: vi.fn() },
      notificationOutboxRepository: { listRecentByFlightOrderId: vi.fn() },
      cancellationRepository: { findLatestRequestByFlightOrderId: vi.fn() },
    }
  )

  expect(listOrders).toHaveBeenCalledWith({
    limit: 20,
    offset: 20,
    q: "customer@example.com",
    status: "cancelled",
    sort: "newest",
  })
  expect(result.total).toBe(23)
  expect(result.pageCount).toBe(2)
  expect(result.items[0]).toMatchObject({
    bookingReference: "BK-ADMIN123",
    customerEmail: "customer@example.com",
    statusLabel: "Cancelled",
    statusTone: "cancelled",
    cancellationRequestId: "fcr_1",
    paymentLabel: "Paid",
  })
})

function createOrderRecord(): FlightOrderRecord {
  return {
    id: "fdo_admin_1",
    bookingReference: "BK-ADMIN123",
    checkoutSessionId: "chs_admin_1",
    paymentAttemptId: "pat_admin_1",
    duffelOrderId: "ord_admin_1",
    partialOfferRequestId: "por_admin_1",
    offerId: "off_admin_1",
    selectedPartialOffers: [],
    ownerUserId: "usr_1",
    ownerGuestId: null,
    ownerOrgId: null,
    contactEmail: "customer@example.com",
    contactEmailHash: "hash_1",
    paymentMode: "pay_now",
    settlementType: "balance",
    currency: "AED",
    netAmount: 500,
    sellAmount: 566.55,
    duffelTotalAmount: 500,
    duffelTotalCurrency: "AED",
    paymentAwaiting: false,
    paymentRequiredBy: null,
    priceGuaranteeExpiresAt: null,
    paidAt: new Date("2026-08-06T12:26:00.000Z"),
    orderSnapshot: {
      schemaVersion: 2,
      routeLabel: "CMB → DXB",
      journeyTypeLabel: "One way",
      passengerCount: 1,
      airlineBookingReference: "VHW6RK",
      legs: [
        {
          ownerName: "Duffel Airways",
          ownerLogoSymbolUrl: null,
          departureAtIso: "2026-08-26T19:21:00.000Z",
          departureLabel: "Wed, 26 Aug 2026, 19:21",
        },
      ],
    },
    createdAt: new Date("2026-08-06T12:26:00.000Z"),
    updatedAt: new Date("2026-08-06T12:28:00.000Z"),
  }
}
