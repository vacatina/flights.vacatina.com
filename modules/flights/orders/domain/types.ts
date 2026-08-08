import type { Offer, Order } from "@duffel/api/types"
import type { SerializedMoney } from "@/modules/currency/domain"

export type BookingNotificationEventType =
  | "booking_confirmed"
  | "hold_created"
  | "reconciliation_required"

export interface FlightOrderSnapshotTimelineEvent {
  id: string
  dateTimeLabel: string
  description: string
  segmentDurationLabel?: string
  meta: string[]
}

export interface FlightOrderSnapshotLayover {
  id: string
  label: string
}

export interface FlightOrderSnapshotLeg {
  legIndex: number
  title: string
  ownerName: string
  ownerLogoSymbolUrl: string | null
  departureIata: string
  arrivalIata: string
  routeLabel: string
  subtitle: string
  departureTimeLabel: string
  arrivalTimeLabel: string
  departureAtIso: string | null
  arrivalAtIso: string | null
  departureLabel: string
  arrivalLabel: string
  durationLabel: string
  stopsLabel: string
  stopsDetails: string
  timeline: FlightOrderSnapshotTimelineEvent[]
  layovers: FlightOrderSnapshotLayover[]
}

export interface FlightOrderSnapshotPassenger {
  id: string
  label: string
  typeLabel: string
  fullName: string | null
  dateOfBirthLabel: string | null
  genderLabel: string | null
  email: string | null
  phoneNumber: string | null
}

export interface FlightOrderSnapshotBillingSummary {
  fareAmountLabel: string | null
  fareMoney?: SerializedMoney | null
  taxesAmountLabel: string | null
  taxesMoney?: SerializedMoney | null
  totalAmountLabel: string
  totalMoney?: SerializedMoney | null
}

export interface FlightOrderSnapshotTicketDocument {
  uniqueIdentifier: string
  type: string
  passengerIds: string[]
}

export interface FlightOrderSnapshotBookedService {
  id: string
  type: string
  totalAmountLabel: string
  totalMoney?: SerializedMoney | null
  passengerIds: string[]
  segmentIds: string[]
}

export interface FlightOrderSnapshotMetadataEntry {
  key: string
  value: string
}

export interface FlightOrderSnapshotConditionsSummary {
  changes: string
  changesMoney?: SerializedMoney | null
  refunds: string
  refundsMoney?: SerializedMoney | null
}

export interface FlightOrderSnapshot extends Record<string, unknown> {
  schemaVersion: 1 | 2
  journeyTypeLabel: string
  routeLabel: string
  passengerCount: number
  cabinClassLabel: string
  currency: string
  sellAmount: number
  sellAmountLabel: string
  sellMoney?: SerializedMoney | null
  createdAtIso: string
  airlineBookingReference: string | null
  availableActions: string[]
  ticketDocuments: FlightOrderSnapshotTicketDocument[]
  bookedServices: FlightOrderSnapshotBookedService[]
  metadataEntries: FlightOrderSnapshotMetadataEntry[]
  conditions: FlightOrderSnapshotConditionsSummary
  legs: FlightOrderSnapshotLeg[]
  passengers: FlightOrderSnapshotPassenger[]
  billingSummary: FlightOrderSnapshotBillingSummary
}

export interface BuildFlightOrderSnapshotInput {
  offer: Offer
  paymentMode: "pay_now" | "hold"
  currency: string
  sellAmount: number
  contact?: {
    email?: string
    phoneNumber?: string
  }
  order?: Order | null
  travelers?: Array<{
    id: string
    type: "adult" | "child" | "infant_without_seat"
    title?: string
    givenName?: string
    familyName?: string
    bornOn?: string
    gender?: string
    email?: string
    phoneNumber?: string
  }>
  now?: Date
}

export type BookingListStatusFilter =
  | "all"
  | "confirmed"
  | "payment_pending"
  | "on_hold"

export type BookingListSort =
  | "newest"
  | "oldest"
  | "amount_high"
  | "amount_low"

export type BookingListStatusCode =
  | "confirmed"
  | "payment_pending"
  | "on_hold"

export interface BookingListItem {
  bookingReference: string
  routeLabel: string
  journeyTypeLabel: string
  legCount: number
  passengerCount: number
  airlineName: string
  airlineLogoSymbolUrl: string | null
  departureDateLabel: string | null
  returnDateLabel: string | null
  statusCode: BookingListStatusCode
  createdAtLabel: string
  paymentMode: "pay_now" | "hold"
  statusLabel: string
  cancellationStatus: import("@/modules/flights/cancellations/domain").FlightCancellationStatus | null
  sellAmountLabel: string
  sellMoney: SerializedMoney
}

export interface BookingDetailModel {
  bookingReference: string
  checkoutSessionId: string
  duffelOrderId: string
  paymentMode: "pay_now" | "hold"
  statusLabel: string
  contactEmail: string
  createdAtLabel: string
  paymentRequiredByLabel: string | null
  priceGuaranteeExpiresAtLabel: string | null
  paidAtLabel: string | null
  checkoutSessionStatus: string | null
  paymentProvider: string | null
  providerOrderId: string | null
  providerPaymentId: string | null
  providerStatusCode: string | null
  providerStatusMessage: string | null
  paymentCurrency: string | null
  paymentAmountLabel: string | null
  paymentMoney: SerializedMoney | null
  checkoutErrorMessage: string | null
  notifications: BookingDetailNotificationItem[]
  snapshot: FlightOrderSnapshot
}

export interface BookingDetailNotificationItem {
  id: string
  eventType: BookingNotificationEventType
  status: "pending" | "sent" | "failed"
  createdAtLabel: string
  sentAtLabel: string | null
  lastError: string | null
}
