import { describe, expect, test } from "vitest"

import {
  adminFlightCancellationUpdateSchema,
  calculateCancellationFee,
  canTransitionCancellationStatus,
  capCustomerRefundAmount,
  createFlightCancellationRequestInputSchema,
  getRejectedCancellationCooldownEndsAt,
  isActiveCancellationStatus,
  isRejectedCancellationCooldownActive,
  isTerminalCancellationStatus,
} from "@/modules/flights/cancellations/domain"

describe("cancellation fee calculation", () => {
  test("returns zero for no-fee cancellations", () => {
    expect(
      calculateCancellationFee({
        feeType: "none",
        feeValue: 99,
        baseAmount: 500,
        currency: "USD",
      })
    ).toBe(0)
  })

  test("supports fixed and percentage fees with currency rounding", () => {
    expect(
      calculateCancellationFee({
        feeType: "fixed",
        feeValue: 12.345,
        baseAmount: 500,
        currency: "USD",
      })
    ).toBe(12.35)

    expect(
      calculateCancellationFee({
        feeType: "percent",
        feeValue: 7.5,
        baseAmount: 199.99,
        currency: "USD",
      })
    ).toBe(15)
  })

  test("does not allow negative or invalid fees to leak into calculations", () => {
    expect(
      calculateCancellationFee({
        feeType: "fixed",
        feeValue: -10,
        baseAmount: 200,
        currency: "USD",
      })
    ).toBe(0)
  })
})

describe("customer refund cap", () => {
  test("caps customer refund at the captured payment amount", () => {
    expect(
      capCustomerRefundAmount({
        airlineRefundAmount: 400,
        feeAmount: 25,
        capturedPaymentAmount: 300,
        currency: "USD",
      })
    ).toBe(300)
  })

  test("subtracts service fee and never returns a negative refund", () => {
    expect(
      capCustomerRefundAmount({
        airlineRefundAmount: 40,
        feeAmount: 75,
        capturedPaymentAmount: 300,
        currency: "USD",
      })
    ).toBe(0)
  })
})

describe("rejected request cooldown", () => {
  const rejectedAt = new Date("2026-07-31T10:00:00.000Z")

  test("is active until the cooldown window expires", () => {
    expect(
      isRejectedCancellationCooldownActive({
        rejectedAt,
        now: new Date("2026-07-31T10:09:59.000Z"),
        cooldownMinutes: 10,
      })
    ).toBe(true)

    expect(
      isRejectedCancellationCooldownActive({
        rejectedAt,
        now: new Date("2026-07-31T10:10:00.000Z"),
        cooldownMinutes: 10,
      })
    ).toBe(false)
  })

  test("returns the cooldown end time", () => {
    expect(
      getRejectedCancellationCooldownEndsAt({
        rejectedAt,
        cooldownMinutes: 10,
      }).toISOString()
    ).toBe("2026-07-31T10:10:00.000Z")
  })
})

describe("status helpers", () => {
  test("validates allowed transitions", () => {
    expect(canTransitionCancellationStatus("requested", "quote_pending")).toBe(
      true
    )
    expect(canTransitionCancellationStatus("requested", "completed")).toBe(
      false
    )
    expect(canTransitionCancellationStatus("rejected", "requested")).toBe(true)
  })

  test("classifies active and terminal statuses", () => {
    expect(isActiveCancellationStatus("refund_pending")).toBe(true)
    expect(isTerminalCancellationStatus("completed")).toBe(true)
    expect(isTerminalCancellationStatus("manual_processing")).toBe(false)
  })
})

describe("request validation", () => {
  test("accepts a valid guest cancellation request", () => {
    const parsed = createFlightCancellationRequestInputSchema.parse({
      flightOrderId: "flo_123",
      bookingReference: "VAC123",
      duffelOrderId: "ord_123",
      requestedByGuestId: "guest_123",
      customerReason:
        "My travel plans changed and I need to cancel this booking.",
    })

    expect(parsed.requestedByGuestId).toBe("guest_123")
  })

  test("requires a requester and meaningful customer reason", () => {
    const result = createFlightCancellationRequestInputSchema.safeParse({
      flightOrderId: "flo_123",
      bookingReference: "VAC123",
      duffelOrderId: "ord_123",
      customerReason: "too short",
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain(
      "requestedByUserId"
    )
  })

  test("requires rejection reason when admin rejects", () => {
    expect(
      adminFlightCancellationUpdateSchema.safeParse({
        status: "rejected",
      }).success
    ).toBe(false)
  })
})
