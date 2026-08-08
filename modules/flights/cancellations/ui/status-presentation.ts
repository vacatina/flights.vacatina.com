import type { FlightCancellationStatus } from "@/modules/flights/cancellations/domain"

export type CustomerBookingStatusTone =
  | "active"
  | "cancelled"
  | "pending"
  | "attention"

export interface CustomerBookingStatusPresentation {
  label: string
  description: string | null
  tone: CustomerBookingStatusTone
}

const refundInProgressStatuses = new Set<FlightCancellationStatus>([
  "duffel_cancelled",
  "refund_pending",
  "refund_completed",
])

const cancellationInProgressStatuses = new Set<FlightCancellationStatus>([
  "requested",
  "quote_pending",
  "quote_ready",
  "admin_review_required",
  "duffel_confirming",
  "manual_processing",
])

export function getCustomerBookingStatus(input: {
  bookingStatusLabel: string
  cancellationStatus?: FlightCancellationStatus | null
}): CustomerBookingStatusPresentation {
  const { bookingStatusLabel, cancellationStatus } = input

  if (cancellationStatus === "completed") {
    return {
      label: "Cancelled",
      description: "This itinerary is no longer active.",
      tone: "cancelled",
    }
  }

  if (cancellationStatus && refundInProgressStatuses.has(cancellationStatus)) {
    return {
      label: "Cancelled · Refund processing",
      description:
        "The itinerary is cancelled and the refund is still being processed.",
      tone: "cancelled",
    }
  }

  if (
    cancellationStatus &&
    cancellationInProgressStatuses.has(cancellationStatus)
  ) {
    return {
      label: "Cancellation in progress",
      description:
        "The booking remains active until the cancellation is confirmed.",
      tone: "pending",
    }
  }

  if (cancellationStatus === "rejected") {
    return {
      label: bookingStatusLabel,
      description:
        "The cancellation request was declined; this booking remains active.",
      tone: "attention",
    }
  }

  if (cancellationStatus === "failed") {
    return {
      label: bookingStatusLabel,
      description:
        "The cancellation could not be completed; this booking remains active.",
      tone: "attention",
    }
  }

  return {
    label: bookingStatusLabel,
    description: null,
    tone: "active",
  }
}
