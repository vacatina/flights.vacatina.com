import { describe, expect, test } from "vitest"

import { getCustomerBookingStatus } from "@/modules/flights/cancellations/ui/status-presentation"

describe("getCustomerBookingStatus", () => {
  test("makes a completed cancellation the primary booking state", () => {
    expect(
      getCustomerBookingStatus({
        bookingStatusLabel: "Confirmed",
        cancellationStatus: "completed",
      })
    ).toEqual({
      label: "Cancelled",
      description: "This itinerary is no longer active.",
      tone: "cancelled",
    })
  })

  test("explains that an early cancellation request has not cancelled the trip yet", () => {
    expect(
      getCustomerBookingStatus({
        bookingStatusLabel: "Confirmed",
        cancellationStatus: "quote_pending",
      })
    ).toEqual({
      label: "Cancellation in progress",
      description:
        "The booking remains active until the cancellation is confirmed.",
      tone: "pending",
    })
  })

  test("keeps a rejected cancellation booking active", () => {
    expect(
      getCustomerBookingStatus({
        bookingStatusLabel: "Confirmed",
        cancellationStatus: "rejected",
      })
    ).toEqual({
      label: "Confirmed",
      description:
        "The cancellation request was declined; this booking remains active.",
      tone: "attention",
    })
  })
})
