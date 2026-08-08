import { expect, test, vi } from "vitest"

import type {
  FlightOrderRow,
  FlightRefundAttemptRow,
  PaymentAttemptRow,
} from "@/lib/db"
import type {
  AdminPaymentDetailRecord,
  AdminPaymentRepositoryRecord,
} from "@/modules/payments/server/admin-repository"
import {
  getAdminPaymentDetail,
  listAdminPayments,
} from "@/modules/payments/server/admin-service"

vi.mock("server-only", () => ({}))

test("listAdminPayments separates settled payment and completed refund state", async () => {
  const record = createRecord({
    attemptStatus: "fulfilled",
    refundStatus: "completed",
  })
  const listRecords = vi
    .fn()
    .mockResolvedValue({ records: [record], total: 23 })
  const getSummary = vi.fn().mockResolvedValue({
    total: 30,
    settled: 24,
    needsAttention: 2,
    refundsPending: 3,
  })

  const result = await listAdminPayments(
    {
      page: 2,
      pageSize: 20,
      q: "BK-PAY123",
      paymentStatus: "paid",
      refundStatus: "completed",
      sort: "newest",
    },
    {
      listRecords,
      getSummary,
      getDetailRecord: vi.fn(),
    }
  )

  expect(listRecords).toHaveBeenCalledWith({
    page: 2,
    pageSize: 20,
    q: "BK-PAY123",
    paymentStatus: "paid",
    refundStatus: "completed",
    sort: "newest",
  })
  expect(result.pageCount).toBe(2)
  expect(result.summary.needsAttention).toBe(2)
  expect(result.items[0]).toMatchObject({
    id: "pat_admin_1",
    bookingReference: "BK-PAY123",
    customerEmail: "customer@example.com",
    statusLabel: "Paid · Fulfilled",
    statusTone: "success",
    refundStatusLabel: "Refunded",
    refundAmount: 140.23,
    refundCurrency: "USD",
  })
})

test("getAdminPaymentDetail exposes provider events and safe reconciliation state", async () => {
  const record: AdminPaymentDetailRecord = {
    ...createRecord({ attemptStatus: "reconciliation_required" }),
    events: [
      {
        id: "pev_1",
        paymentAttemptId: "pat_admin_1",
        eventType: "RECONCILIATION_REQUIRED",
        provider: "paypal",
        providerEventId: null,
        providerOrderId: "PAYPAL-ORDER-1",
        providerCaptureId: null,
        amount: "154.2500",
        currency: "USD",
        payload: null,
        metadata: null,
        createdAt: new Date("2026-08-08T08:00:00.000Z"),
      },
    ],
    refunds: [],
    outboxTasks: [],
    webhooks: [],
  }

  const detail = await getAdminPaymentDetail("pat_admin_1", {
    listRecords: vi.fn(),
    getSummary: vi.fn(),
    getDetailRecord: vi.fn().mockResolvedValue(record),
  })

  expect(detail?.payment).toMatchObject({
    statusLabel: "Needs reconciliation",
    canReconcile: true,
    providerOrderId: "PAYPAL-ORDER-1",
  })
  expect(detail?.events[0]).toMatchObject({
    label: "Reconciliation required",
    amount: 154.25,
  })
})

function createRecord(input: {
  attemptStatus: PaymentAttemptRow["status"]
  refundStatus?: FlightRefundAttemptRow["status"]
}): AdminPaymentRepositoryRecord {
  return {
    attempt: createAttempt(input.attemptStatus),
    checkoutSession: null,
    order: createOrder(),
    cancellationRequestId: input.refundStatus ? "fcr_1" : null,
    cancellationStatus: input.refundStatus ? "completed" : null,
    refund: input.refundStatus ? createRefund(input.refundStatus) : null,
  }
}

function createAttempt(status: PaymentAttemptRow["status"]): PaymentAttemptRow {
  return {
    id: "pat_admin_1",
    internalOrderType: "flight_checkout",
    internalOrderId: "chs_admin_1",
    ownerUserId: "usr_1",
    ownerGuestId: null,
    ownerOrgId: null,
    provider: "paypal",
    status,
    currency: "USD",
    amount: "154.2500",
    providerOrderId: "PAYPAL-ORDER-1",
    providerCaptureId: null,
    providerStatus: "COMPLETED",
    createIdempotencyKey: "create_1",
    captureIdempotencyKey: "capture_1",
    clientIdempotencyKey: "client_1",
    checkoutPayloadSnapshot: null,
    lastProviderPayload: null,
    failureCode: status === "reconciliation_required" ? "provider_state" : null,
    failureMessage:
      status === "reconciliation_required" ? "Provider state differs." : null,
    reconciliationRequiredAt:
      status === "reconciliation_required"
        ? new Date("2026-08-08T08:00:00.000Z")
        : null,
    nextReconciliationAt: null,
    createdAt: new Date("2026-08-06T12:26:00.000Z"),
    updatedAt: new Date("2026-08-08T08:00:00.000Z"),
  }
}

function createOrder(): FlightOrderRow {
  return {
    id: "fdo_admin_1",
    bookingReference: "BK-PAY123",
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
    currency: "USD",
    netAmount: "140.0000",
    sellAmount: "154.2500",
    duffelTotalAmount: "140.0000",
    duffelTotalCurrency: "USD",
    paymentAwaiting: false,
    paymentRequiredBy: null,
    priceGuaranteeExpiresAt: null,
    paidAt: new Date("2026-08-06T12:26:00.000Z"),
    orderSnapshot: {
      routeLabel: "CMB → DXB",
    },
    createdAt: new Date("2026-08-06T12:26:00.000Z"),
    updatedAt: new Date("2026-08-06T12:28:00.000Z"),
  }
}

function createRefund(
  status: FlightRefundAttemptRow["status"]
): FlightRefundAttemptRow {
  return {
    id: "fre_1",
    cancellationRequestId: "fcr_1",
    paymentAttemptId: "pat_admin_1",
    provider: "paypal",
    providerCaptureId: "CAPTURE-1",
    providerRefundId: "REFUND-1",
    amount: "140.2300",
    currency: "USD",
    status,
    rawPayload: null,
    createdAt: new Date("2026-08-07T08:00:00.000Z"),
    updatedAt: new Date("2026-08-07T08:02:00.000Z"),
  }
}
