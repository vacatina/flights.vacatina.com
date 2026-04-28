import type { Offer } from "@duffel/api/types"

export type BookingNotificationEventType =
  | "booking_confirmed"
  | "hold_created"
  | "reconciliation_required"

export interface FlightOrderSnapshotLeg {
  legIndex: number
  title: string
  ownerName: string
  ownerLogoSymbolUrl: string | null
  departureIata: string
  arrivalIata: string
  routeLabel: string
  departureAtIso: string | null
  arrivalAtIso: string | null
  departureLabel: string
  arrivalLabel: string
  durationLabel: string
  stopsLabel: string
}

export interface FlightOrderSnapshot extends Record<string, unknown> {
  schemaVersion: 1
  journeyTypeLabel: string
  routeLabel: string
  passengerCount: number
  cabinClassLabel: string
  currency: string
  sellAmount: number
  sellAmountLabel: string
  createdAtIso: string
  legs: FlightOrderSnapshotLeg[]
}

export interface BuildFlightOrderSnapshotInput {
  offer: Offer
  paymentMode: "pay_now" | "hold"
  currency: string
  sellAmount: number
  now?: Date
}

export interface BookingListItem {
  bookingReference: string
  routeLabel: string
  createdAtLabel: string
  paymentMode: "pay_now" | "hold"
  statusLabel: string
  sellAmountLabel: string
}

export interface BookingDetailModel {
  bookingReference: string
  duffelOrderId: string
  paymentMode: "pay_now" | "hold"
  statusLabel: string
  contactEmail: string
  createdAtLabel: string
  paymentRequiredByLabel: string | null
  priceGuaranteeExpiresAtLabel: string | null
  paidAtLabel: string | null
  snapshot: FlightOrderSnapshot
}
