import type { CreateOrderService, Offer, SeatMap } from "@duffel/api/types"
import type { PayHereStartPaymentPayload } from "@/modules/flights/payments/payhere"

export type CheckoutPaymentMode = "pay_now" | "hold"
export type CheckoutWizardStep = "traveler" | "extras" | "pay"

export interface CheckoutUrlState {
  offerId: string
  selectedPartialOffers: string[]
  quoteId: string
  step: CheckoutWizardStep
}

export interface CheckoutContactInput {
  email: string
  phoneNumber: string
}

export interface CheckoutBillingInput {
  address: string
  city: string
  country: string
}

export interface CheckoutIdentityDocumentInput {
  type: "passport" | "tax_id"
  uniqueIdentifier: string
  issuingCountryCode: string
  expiresOn: string
}

export interface CheckoutPassengerInput {
  id: string
  type: "adult" | "child" | "infant_without_seat"
  title: "mr" | "mrs" | "ms" | "miss" | "dr"
  givenName: string
  familyName: string
  bornOn: string
  gender: "m" | "f"
  email?: string
  phoneNumber?: string
  identityDocument?: CheckoutIdentityDocumentInput | null
}

export interface CheckoutMetadataPairInput {
  key: string
  value: string
}

export interface CheckoutAncillaryPayloadMetadata {
  offer_total_amount?: string
  offer_total_currency?: string
  baggage_services?: Array<{ id: string; quantity: number; total_amount?: string }>
  seat_services?: Array<{ id: string; quantity: number; total_amount?: string }>
  cancel_for_any_reason_services?: Array<{
    id: string
    quantity: number
    total_amount?: string
  }>
}

export interface CheckoutAncillarySelectionInput {
  services: CreateOrderService[]
  metadata?: CheckoutAncillaryPayloadMetadata | null
}

export interface CheckoutSubmitInput {
  partialOfferRequestId: string
  offerId: string
  quoteId: string
  selectedPartialOffers: string[]
  paymentMode: CheckoutPaymentMode
  contact: CheckoutContactInput
  billing: CheckoutBillingInput | null
  passengers: CheckoutPassengerInput[]
  metadata: CheckoutMetadataPairInput[]
  ancillarySelection?: CheckoutAncillarySelectionInput | null
}

export interface CheckoutTripSummaryViewModel {
  journeyTypeLabel: string
  dateRangeLabel: string
  passengersLabel: string
  cabinLabel: string
  routeLabel: string
  offerExpiresAtLabel: string | null
}

export interface CheckoutTimelineEventViewModel {
  id: string
  dateTimeLabel: string
  description: string
  segmentDurationLabel?: string
  meta: string[]
}

export interface CheckoutLegViewModel {
  legIndex: number
  legTitle: string
  dateLabel: string
  ownerName: string
  ownerLogoSymbolUrl: string | null
  departureTimeLabel: string
  arrivalTimeLabel: string
  arrivalDayOffset: number
  durationLabel: string
  routeLabel: string
  stopsLabel: string
  stopsDetails: string
  timeline: CheckoutTimelineEventViewModel[]
  layovers: Array<{ id: string; label: string }>
}

export interface CheckoutQuoteViewModel {
  quoteId: string
  currency: string
  fareNetAmount: number
  fareSellAmount: number
  fareSellAmountLabel: string
  expiresAtIso: string
  expiresAtLabel: string
}

export interface CheckoutPaymentRequirementsViewModel {
  requiresInstantPayment: boolean
  canHold: boolean
  paymentRequiredByIso: string | null
  paymentRequiredByLabel: string | null
  priceGuaranteeExpiresAtIso: string | null
  priceGuaranteeExpiresAtLabel: string | null
}

export interface CheckoutPassengerDefaultViewModel {
  id: string
  type: "adult" | "child" | "infant_without_seat"
  label: string
}

export interface CheckoutPageData {
  partialOfferRequestId: string
  state: CheckoutUrlState
  quote: CheckoutQuoteViewModel
  tripSummary: CheckoutTripSummaryViewModel
  selectedFlights: CheckoutLegViewModel[]
  paymentRequirements: CheckoutPaymentRequirementsViewModel
  identityDocumentsRequired: boolean
  supportedIdentityDocumentTypes: Offer["supported_passenger_identity_document_types"]
  passengerDefaults: CheckoutPassengerDefaultViewModel[]
  ancillary: {
    offer: Offer
    seatMaps: SeatMap[]
  }
  payHere: {
    payNowEnabled: boolean
    unavailableReason: string | null
    chargeCurrency: "LKR"
    estimatedFareAmountLkr: number | null
    estimatedFareAmountLkrLabel: string | null
    fxSourceCurrency: string
    fxTargetCurrency: "LKR"
    fxBaseRate: number | null
    fxBufferPercent: number
    fxEffectiveRate: number | null
    scriptUrl: string
  }
}

export interface CheckoutAncillaryPricingLine {
  id: string
  quantity: number
  currency: string
  netUnitAmount: number
  sellUnitAmount: number
  netLineTotal: number
  sellLineTotal: number
}

export interface CheckoutAncillaryPricing {
  lines: CheckoutAncillaryPricingLine[]
  netTotal: number
  sellTotal: number
  currency: string
}

export interface CheckoutSubmissionResult {
  checkoutSessionId: string
  flightOrderId: string
  duffelOrderId: string
  paymentMode: CheckoutPaymentMode
  totalSellAmountLabel: string
  paymentRequiredByLabel: string | null
}

export interface CheckoutPaymentStartResult {
  checkoutSessionId: string
  payment: PayHereStartPaymentPayload
  chargeAmount: number
  chargeCurrency: "LKR"
  chargeAmountLabel: string
  status: "processing"
}

export interface CheckoutSessionStatusResult {
  checkoutSessionId: string
  status: "processing" | "payment_authorized" | "completed" | "failed" | "reconciliation_required"
  message: string | null
  duffelOrderId: string | null
  totalChargeAmountLabel: string | null
}
