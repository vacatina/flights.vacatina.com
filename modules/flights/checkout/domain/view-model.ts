import { format, isValid, parseISO } from "date-fns"
import type { Offer, SeatMap } from "@duffel/api/types"

import { normalizeOfferForLeg } from "@/modules/flights/results/domain/offer-view-model"
import { currencyMinorUnit } from "@/modules/flights/pricing/domain"
import {
  buildJourneyRouteSummary,
  getJourneyLegTitle,
  getJourneyTypeLabelFromSlices,
  inferJourneyTypeFromSlices,
} from "@/lib/shared/journey-display"
import type {
  CheckoutPageData,
  CheckoutPassengerDefaultViewModel,
  CheckoutPaymentRequirementsViewModel,
  CheckoutQuoteViewModel,
  CheckoutTripSummaryViewModel,
  CheckoutUrlState,
} from "@/modules/flights/checkout/domain/types"

interface BuildCheckoutPageModelInput {
  partialOfferRequestId: string
  state: CheckoutUrlState
  offer: Offer
  seatMaps: SeatMap[]
  quote: {
    id: string
    currency: string
    netAmount: number
    sellAmount: number
    expiresAt: Date
  }
  airlineLogosByAirlineId?: Record<string, string>
}

export function buildCheckoutPageModel({
  partialOfferRequestId,
  state,
  offer,
  seatMaps,
  quote,
  airlineLogosByAirlineId = {},
}: BuildCheckoutPageModelInput): CheckoutPageData {
  const journeySlices = offer.slices.map((slice) => ({
    originIataCode: slice.origin.iata_code,
    destinationIataCode: slice.destination.iata_code,
  }))
  const journeyType = inferJourneyTypeFromSlices(journeySlices)
  const selectedFlights = offer.slices.map((_, legIndex) => {
    const normalized = normalizeOfferForLeg(offer, legIndex, airlineLogosByAirlineId)

    if (!normalized) {
      return {
        legIndex,
        legTitle: getJourneyLegTitle({
          journeyType,
          legIndex,
          totalLegs: offer.slices.length,
          singleLegTitle: "Selected flight",
        }),
        dateLabel: "",
        ownerName: offer.owner.name ?? "Unknown airline",
        ownerLogoSymbolUrl:
          airlineLogosByAirlineId[offer.owner.id] ?? offer.owner.logo_symbol_url ?? null,
        departureTimeLabel: "--:--",
        arrivalTimeLabel: "--:--",
        arrivalDayOffset: 0,
        durationLabel: "00h 00m",
        routeLabel: "-- - --",
        stopsLabel: "N/A",
        stopsDetails: "",
        timeline: [],
        layovers: [],
      }
    }

    const slice = offer.slices[legIndex]
    const firstDeparture = parseDateTime(slice?.segments[0]?.departing_at)

    return {
      legIndex,
      legTitle: getJourneyLegTitle({
        journeyType,
        legIndex,
        totalLegs: offer.slices.length,
        singleLegTitle: "Selected flight",
      }),
      dateLabel: firstDeparture ? format(firstDeparture, "EEE, d MMM yyyy") : "",
      ownerName: normalized.ownerName,
      ownerLogoSymbolUrl: normalized.ownerLogoSymbolUrl,
      departureTimeLabel: normalized.departureTimeLabel,
      arrivalTimeLabel: normalized.arrivalTimeLabel,
      arrivalDayOffset: normalized.arrivalDayOffset,
      durationLabel: normalized.durationLabel,
      routeLabel: normalized.routeLabel,
      stopsLabel: normalized.stopsLabel,
      stopsDetails: normalized.stopsDetails ?? "Direct flight",
      timeline: normalized.timeline,
      layovers: normalized.layovers,
    }
  })

  return {
    partialOfferRequestId,
    state,
    quote: toQuoteViewModel(quote),
    tripSummary: createTripSummary(offer, journeySlices),
    selectedFlights,
    paymentRequirements: createPaymentRequirements(offer),
    identityDocumentsRequired: offer.passenger_identity_documents_required,
    supportedIdentityDocumentTypes: offer.supported_passenger_identity_document_types,
    passengerDefaults: createPassengerDefaults(offer),
    ancillary: {
      offer,
      seatMaps,
    },
    payment: {
      provider: "paypal",
      checkoutUi: "buttons",
      payNowEnabled: false,
      unavailableReason: "PayPal availability is being checked.",
      chargeAmount: null,
      chargeCurrency: quote.currency,
      chargeAmountLabel: null,
    },
  }
}

function createTripSummary(
  offer: Offer,
  journeySlices: { originIataCode: string | null; destinationIataCode: string | null }[]
): CheckoutTripSummaryViewModel {
  const firstSlice = offer.slices[0]
  const lastSlice = offer.slices[offer.slices.length - 1]
  const firstDeparture = parseDateTime(firstSlice?.segments[0]?.departing_at)
  const lastDeparture = parseDateTime(lastSlice?.segments[0]?.departing_at)
  const firstPassenger = firstSlice?.segments[0]?.passengers[0]
  const passengerCount = offer.passengers.length

  return {
    journeyTypeLabel: getJourneyTypeLabelFromSlices(journeySlices),
    dateRangeLabel:
      firstDeparture && lastDeparture
        ? `${format(firstDeparture, "EEE, d MMM yyyy")} - ${format(lastDeparture, "EEE, d MMM yyyy")}`
        : "Date unavailable",
    passengersLabel: `${passengerCount} passenger${passengerCount > 1 ? "s" : ""}`,
    cabinLabel: firstPassenger?.cabin_class
      ? formatCabinClass(firstPassenger.cabin_class)
      : "Economy",
    routeLabel: buildJourneyRouteSummary(journeySlices),
    offerExpiresAtLabel: toOfferExpiresAtLabel(offer),
  }
}

function createPaymentRequirements(offer: Offer): CheckoutPaymentRequirementsViewModel {
  const requirements = offer.payment_requirements
  const paymentRequiredBy = parseDateTime(requirements.payment_required_by)
  const priceGuaranteeExpiresAt = parseDateTime(
    requirements.price_guarantee_expires_at
  )

  return {
    requiresInstantPayment: requirements.requires_instant_payment,
    canHold: !requirements.requires_instant_payment,
    paymentRequiredByIso: requirements.payment_required_by,
    paymentRequiredByLabel: paymentRequiredBy
      ? format(paymentRequiredBy, "dd/MM/yyyy, HH:mm")
      : null,
    priceGuaranteeExpiresAtIso: requirements.price_guarantee_expires_at,
    priceGuaranteeExpiresAtLabel: priceGuaranteeExpiresAt
      ? format(priceGuaranteeExpiresAt, "dd/MM/yyyy, HH:mm")
      : null,
  }
}

function toQuoteViewModel(input: {
  id: string
  currency: string
  netAmount: number
  sellAmount: number
  expiresAt: Date
}): CheckoutQuoteViewModel {
  return {
    quoteId: input.id,
    currency: input.currency,
    fareNetAmount: input.netAmount,
    fareSellAmount: input.sellAmount,
    fareSellAmountLabel: formatCurrencyAmount(input.sellAmount, input.currency),
    expiresAtIso: input.expiresAt.toISOString(),
    expiresAtLabel: format(input.expiresAt, "dd/MM/yyyy, HH:mm"),
  }
}

function createPassengerDefaults(offer: Offer): CheckoutPassengerDefaultViewModel[] {
  return offer.passengers.map((passenger, index) => {
    const type =
      passenger.type === "adult" ||
      passenger.type === "child" ||
      passenger.type === "infant_without_seat"
        ? passenger.type
        : "adult"

    return {
      id: passenger.id,
      type,
      label: passengerLabel(type, index),
    }
  })
}

function passengerLabel(
  type: CheckoutPassengerDefaultViewModel["type"],
  index: number
) {
  if (type === "adult") {
    return `Adult ${index + 1}`
  }

  if (type === "child") {
    return `Child ${index + 1}`
  }

  return `Infant ${index + 1}`
}

function formatCabinClass(value: string) {
  return value
    .split("_")
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ")
}

function toOfferExpiresAtLabel(offer: Offer) {
  const expiresAt = (offer as { expires_at?: string | null }).expires_at
  const parsed = parseDateTime(expiresAt)

  if (!parsed) {
    return null
  }

  return format(parsed, "dd/MM/yyyy, HH:mm")
}

function parseDateTime(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

function formatCurrencyAmount(amount: number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase()
  const digits = currencyMinorUnit(normalizedCurrency)

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount)
  } catch {
    return `${normalizedCurrency}${amount.toFixed(digits)}`
  }
}
