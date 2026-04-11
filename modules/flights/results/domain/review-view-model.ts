import {
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isValid,
  parseISO,
} from "date-fns"
import type { Offer, OfferRequest } from "@duffel/api/types"

import {
  createLegBreadcrumbs,
  formatMinutesDuration,
  toDurationMinutes,
} from "@/modules/flights/results/domain/offer-view-model"
import { logFlightFlow } from "@/modules/flights/shared/flow-debug"
import type {
  ReviewFareOptionLine,
  ReviewFareOptionViewModel,
  ReviewLegHeaderViewModel,
  ReviewLegSectionViewModel,
  ReviewSummaryViewModel,
  ReviewUrlState,
} from "@/modules/flights/results/domain/review-types"

interface BuildReviewPageModelInput {
  offerRequest: OfferRequest
  selected: string[]
  requestedFare: string[]
  airlineLogosByAirlineId?: Readonly<Record<string, string>>
  offerPricingByOfferId?: Readonly<Record<string, { sellAmount: number }>>
}

interface BuildReviewPageModelResult {
  breadcrumbs: string[]
  totalLegs: number
  state: ReviewUrlState
  legs: ReviewLegSectionViewModel[]
  summary: ReviewSummaryViewModel
}

interface FareOptionGroup {
  key: string
  offers: Offer[]
  minAmount: number
  currency: string
  cabinLabel: string
  fareLabel: string
  lines: ReviewFareOptionLine[]
}

const LOCK_MESSAGE =
  "Choose a fare option for the previous flight to see the available fares for this flight."

export function buildReviewPageModel({
  offerRequest,
  selected,
  requestedFare,
  airlineLogosByAirlineId = {},
  offerPricingByOfferId = {},
}: BuildReviewPageModelInput): BuildReviewPageModelResult {
  logFlightFlow("buildReviewPageModel", "start", {
    selectedCount: selected.length,
    requestedFareCount: requestedFare.length,
    offerCount: offerRequest.offers.length,
    sliceCount: offerRequest.slices.length,
  })
  const offers = (offerRequest.offers as Offer[]).filter(
    (offer) => offer.slices.length > 0
  )
  const totalLegs = Math.max(offerRequest.slices.length, 1)
  const breadcrumbs = createLegBreadcrumbs(offerRequest)
  const normalizedFare: string[] = []
  const legs: ReviewLegSectionViewModel[] = []

  let candidateOffers = offers

  for (let legIndex = 0; legIndex < totalLegs; legIndex += 1) {
    const isLocked = legIndex > normalizedFare.length
    const legOffers = candidateOffers

    const header = createLegHeaderViewModel({
      legIndex,
      totalLegs,
      offer: pickCheapestOffer(legOffers, offerPricingByOfferId) ?? offers[0],
      airlineLogosByAirlineId,
    })

    if (isLocked || legOffers.length === 0) {
      logFlightFlow("buildReviewPageModel", "leg_locked_or_empty", {
        legIndex,
        isLocked,
        legOffersCount: legOffers.length,
        normalizedFareCount: normalizedFare.length,
      })
      legs.push({
        legIndex,
        title: header.title,
        dateLabel: header.dateLabel,
        header,
        options: [],
        isLocked,
        lockMessage: isLocked ? LOCK_MESSAGE : undefined,
      })
      continue
    }

    const groups = groupFareOptionsByLeg(legOffers, legIndex, offerPricingByOfferId)
    const optionGroups = Array.from(groups.values()).sort((left, right) => {
      if (left.minAmount !== right.minAmount) {
        return left.minAmount - right.minAmount
      }

      return left.fareLabel.localeCompare(right.fareLabel)
    })

    const requestedKey = requestedFare[legIndex]
    const selectedKey =
      requestedKey && groups.has(requestedKey) ? requestedKey : undefined

    if (selectedKey) {
      normalizedFare.push(selectedKey)
      candidateOffers = groups.get(selectedKey)?.offers ?? []
      logFlightFlow("buildReviewPageModel", "leg_selected", {
        legIndex,
        selectedKey,
        candidateOffersCount: candidateOffers.length,
      })
    }

    const options: ReviewFareOptionViewModel[] = optionGroups.map((group) => ({
      key: group.key,
      legIndex,
      cabinLabel: group.cabinLabel,
      fareLabel: group.fareLabel,
      lines: group.lines,
      priceFromLabel: formatCurrencyAmount(group.minAmount, group.currency),
      priceFromValue: group.minAmount,
      currency: group.currency,
      isSelected: group.key === selectedKey,
      isSelectable: true,
    }))

    legs.push({
      legIndex,
      title: header.title,
      dateLabel: header.dateLabel,
      header,
      options,
      isLocked: false,
    })
  }

  const summaryOffers = candidateOffers.length > 0 ? candidateOffers : offers
  const summary = createSummaryViewModel(
    summaryOffers,
    normalizedFare.length,
    totalLegs,
    offerPricingByOfferId
  )

  const result = {
    breadcrumbs,
    totalLegs,
    state: {
      selected,
      fare: normalizedFare,
    },
    legs,
    summary,
  }

  logFlightFlow("buildReviewPageModel", "completed", {
    totalLegs: result.totalLegs,
    normalizedFareCount: result.state.fare.length,
    legSectionCount: result.legs.length,
    checkoutEnabled: result.summary.checkoutEnabled,
    finalOfferId: result.summary.finalOfferId,
  })

  return result
}

function createLegHeaderViewModel({
  legIndex,
  totalLegs,
  offer,
  airlineLogosByAirlineId,
}: {
  legIndex: number
  totalLegs: number
  offer: Offer | undefined
  airlineLogosByAirlineId: Readonly<Record<string, string>>
}): ReviewLegHeaderViewModel {
  const fallback: ReviewLegHeaderViewModel = {
    legIndex,
    title: legTitle(totalLegs, legIndex),
    dateLabel: "",
    ownerName: "Unknown airline",
    ownerLogoSymbolUrl: null,
    departureTimeLabel: "--:--",
    arrivalTimeLabel: "--:--",
    arrivalDayOffset: 0,
    durationLabel: "00h 00m",
    routeLabel: "---",
    stopsLabel: "Non-stop",
    stopsDetails: "Direct flight",
  }

  if (!offer) {
    return fallback
  }

  const slice = offer.slices[legIndex] ?? offer.slices[0]

  if (!slice || slice.segments.length === 0) {
    return fallback
  }

  const firstSegment = slice.segments[0]
  const lastSegment = slice.segments[slice.segments.length - 1]
  const departureAt = parseISO(firstSegment.departing_at)
  const arrivalAt = parseISO(lastSegment.arriving_at)
  const departureTimeLabel = isValid(departureAt)
    ? format(departureAt, "HH:mm")
    : "--:--"
  const arrivalTimeLabel = isValid(arrivalAt) ? format(arrivalAt, "HH:mm") : "--:--"
  const dateLabel = isValid(departureAt) ? format(departureAt, "d MMM yyyy") : ""
  const durationMinutes =
    toDurationMinutes(slice.duration) ??
    (isValid(departureAt) && isValid(arrivalAt)
      ? Math.max(0, differenceInMinutes(arrivalAt, departureAt))
      : 0)
  const arrivalDayOffset =
    isValid(departureAt) && isValid(arrivalAt)
      ? Math.max(0, differenceInCalendarDays(arrivalAt, departureAt))
      : 0
  const connections = Math.max(slice.segments.length - 1, 0)
  const firstStopCode = slice.segments[0]?.destination.iata_code

  return {
    legIndex,
    title:
      totalLegs === 1
        ? `Flight to ${slice.destination.iata_code}`
        : legTitle(totalLegs, legIndex),
    dateLabel,
    ownerName: offer.owner.name?.trim() || offer.owner.iata_code || "Unknown airline",
    ownerLogoSymbolUrl:
      airlineLogosByAirlineId[offer.owner.id] ?? offer.owner.logo_symbol_url ?? null,
    departureTimeLabel,
    arrivalTimeLabel,
    arrivalDayOffset,
    durationLabel: formatMinutesDuration(durationMinutes),
    routeLabel: `${slice.origin.iata_code} - ${slice.destination.iata_code}`,
    stopsLabel:
      connections === 0
        ? "Non-stop"
        : `${connections} stop${connections > 1 ? "s" : ""}`,
    stopsDetails:
      connections === 0
        ? "Direct flight"
        : `${connections} stop${connections > 1 ? "s" : ""} ${
            firstStopCode ?? ""
          }`.trim(),
  }
}

function legTitle(totalLegs: number, legIndex: number) {
  if (totalLegs <= 1) {
    return "Flight"
  }

  if (legIndex === 0) {
    return "Outbound"
  }

  if (legIndex === 1) {
    return "Inbound"
  }

  return `Leg ${legIndex + 1}`
}

function groupFareOptionsByLeg(
  offers: Offer[],
  legIndex: number,
  offerPricingByOfferId: Readonly<Record<string, { sellAmount: number }>>
) {
  const groups = new Map<string, FareOptionGroup>()

  for (const offer of offers) {
    const slice = offer.slices[legIndex]

    if (!slice || slice.segments.length === 0) {
      continue
    }

    const key = createFareKey(offer, legIndex)
    const amount = toOfferAmount(offer, offerPricingByOfferId)
    const existing = groups.get(key)

    if (existing) {
      existing.offers.push(offer)
      existing.minAmount = Math.min(existing.minAmount, amount)
      continue
    }

    groups.set(key, {
      key,
      offers: [offer],
      minAmount: amount,
      currency: offer.total_currency,
      cabinLabel: toUpperCabinLabel(slice),
      fareLabel: slice.fare_brand_name?.trim() || toCabinLabel(slice),
      lines: createFareLines(offer, legIndex),
    })
  }

  return groups
}

function createFareKey(offer: Offer, legIndex: number) {
  const slice = offer.slices[legIndex]

  if (!slice) {
    return `missing-slice-${legIndex}`
  }

  const comparison = slice.comparison_key || slice.id
  const ownerId = offer.owner.id || "owner"
  const fareBrand = slice.fare_brand_name?.trim().toLowerCase() || "no_brand"
  const cabin = toCabinSlug(slice)

  return [comparison, ownerId, fareBrand, cabin].join("|")
}

function toCabinSlug(slice: Offer["slices"][number]) {
  const classes = new Set<string>()

  for (const segment of slice.segments) {
    const firstPassenger = segment.passengers[0]

    if (firstPassenger?.cabin_class) {
      classes.add(firstPassenger.cabin_class)
    }
  }

  if (classes.size === 0) {
    return "economy"
  }

  return Array.from(classes)
    .sort((left, right) => left.localeCompare(right))
    .join("_")
}

function toUpperCabinLabel(slice: Offer["slices"][number]) {
  const classes = Array.from(
    new Set(
      slice.segments
        .map((segment) => segment.passengers[0]?.cabin_class)
        .filter(
          (value): value is NonNullable<typeof value> => value !== undefined
        )
    )
  )

  if (classes.length === 0) {
    return "ECONOMY"
  }

  return classes
    .map((value) => value.replaceAll("_", " ").toUpperCase())
    .join(", ")
}

function toCabinLabel(slice: Offer["slices"][number]) {
  const firstClass = slice.segments[0]?.passengers[0]?.cabin_class

  if (!firstClass) {
    return "Economy"
  }

  return firstClass
    .split("_")
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ")
}

function createFareLines(offer: Offer, legIndex: number): ReviewFareOptionLine[] {
  const slice = offer.slices[legIndex]

  if (!slice) {
    return []
  }

  const lines: ReviewFareOptionLine[] = []

  lines.push({
    id: "changes",
    label: formatChangeCondition(offer.conditions.change_before_departure),
    kind: "change",
  })

  lines.push({
    id: "refunds",
    label: formatRefundCondition(offer.conditions.refund_before_departure),
    kind: "refund",
  })

  const holdLine = formatHoldLine(offer)

  if (holdLine) {
    lines.push({
      id: "hold",
      label: holdLine,
      kind: "hold",
    })
  }

  if (hasBaggage(slice, "carry_on")) {
    lines.push({
      id: "carry-on",
      label: "Includes carry-on bags",
      kind: "carry_on",
    })
  }

  if (hasBaggage(slice, "checked")) {
    lines.push({
      id: "checked",
      label: "Includes checked bags",
      kind: "checked",
    })
  }

  return lines
}

function hasBaggage(slice: Offer["slices"][number], baggageType: "carry_on" | "checked") {
  return slice.segments.some((segment) => {
    const baggages = segment.passengers[0]?.baggages ?? []

    return baggages.some(
      (baggage) => baggage.type === baggageType && baggage.quantity > 0
    )
  })
}

function formatChangeCondition(
  condition: Offer["conditions"]["change_before_departure"]
) {
  if (!condition) {
    return "No data on changes"
  }

  if (!condition.allowed) {
    return "Changes not allowed"
  }

  const penalty = toPenaltyLabel(condition.penalty_amount, condition.penalty_currency)

  if (!penalty) {
    return "Changes allowed"
  }

  return `Changes allowed with ${penalty} fee`
}

function formatRefundCondition(
  condition: Offer["conditions"]["refund_before_departure"]
) {
  if (!condition) {
    return "No data on refunds"
  }

  if (!condition.allowed) {
    return "Refunds not allowed"
  }

  const penalty = toPenaltyLabel(condition.penalty_amount, condition.penalty_currency)

  if (!penalty) {
    return "Refunds allowed"
  }

  return `Refunds allowed with ${penalty} fee`
}

function toPenaltyLabel(amount: string | null, currency: string | null) {
  if (!amount || !currency) {
    return null
  }

  const numericAmount = Number(amount)

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return null
  }

  return formatCurrencyAmount(numericAmount, currency)
}

function formatHoldLine(offer: Offer) {
  const paymentRequirements = offer.payment_requirements

  if (paymentRequirements.requires_instant_payment) {
    return null
  }

  if (paymentRequirements.payment_required_by) {
    const paymentRequiredBy = parseISO(paymentRequirements.payment_required_by)

    if (isValid(paymentRequiredBy)) {
      return `Hold space until ${format(paymentRequiredBy, "d MMM yyyy")}`
    }
  }

  if (paymentRequirements.price_guarantee_expires_at) {
    const priceGuaranteeExpiresAt = parseISO(
      paymentRequirements.price_guarantee_expires_at
    )

    if (isValid(priceGuaranteeExpiresAt)) {
      return `Hold price until ${format(priceGuaranteeExpiresAt, "d MMM yyyy")}`
    }
  }

  return "Hold space"
}

function createSummaryViewModel(
  offers: Offer[],
  selectedFareCount: number,
  totalLegs: number,
  offerPricingByOfferId: Readonly<Record<string, { sellAmount: number }>>
): ReviewSummaryViewModel {
  const summaryOffer = pickCheapestOffer(offers, offerPricingByOfferId)
  const checkoutEnabled = selectedFareCount === totalLegs && Boolean(summaryOffer)

  if (!summaryOffer) {
    return {
      soldByLabel: "Sold by Unknown airline",
      conditions: [],
      co2Label: "CO2 data unavailable",
      totalAmountLabel: null,
      checkoutEnabled: false,
      helperText: "No fare options available right now.",
      finalOfferId: null,
    }
  }

  const ownerName = summaryOffer.owner.name?.trim() || summaryOffer.owner.iata_code
  const co2Value = Number(summaryOffer.total_emissions_kg)

  return {
    soldByLabel: `Sold by ${ownerName}`,
    conditions: createSummaryConditions(summaryOffer),
    co2Label: Number.isFinite(co2Value)
      ? `From ${Math.round(co2Value)}kg CO2`
      : "CO2 data unavailable",
    totalAmountLabel: formatCurrencyAmount(
      toOfferAmount(summaryOffer, offerPricingByOfferId),
      summaryOffer.total_currency
    ),
    checkoutEnabled,
    helperText: checkoutEnabled
      ? "Selected fare options for all flights"
      : "Select fare options for all flights",
    finalOfferId: checkoutEnabled ? summaryOffer.id : null,
  }
}

function createSummaryConditions(offer: Offer) {
  const firstLegLines = createFareLines(offer, 0)

  return firstLegLines.map((line) => line.label)
}

function pickCheapestOffer(
  offers: Offer[],
  offerPricingByOfferId: Readonly<Record<string, { sellAmount: number }>>
) {
  if (offers.length === 0) {
    return null
  }

  return [...offers].sort(
    (left, right) =>
      toOfferAmount(left, offerPricingByOfferId) -
      toOfferAmount(right, offerPricingByOfferId)
  )[0]
}

function toOfferAmount(
  offer: Offer,
  offerPricingByOfferId: Readonly<Record<string, { sellAmount: number }>>
) {
  const priced = offerPricingByOfferId[offer.id]

  if (priced && Number.isFinite(priced.sellAmount)) {
    return priced.sellAmount
  }

  const numeric = Number(offer.total_amount)

  if (!Number.isFinite(numeric)) {
    return Number.POSITIVE_INFINITY
  }

  return numeric
}

export function formatCurrencyAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency}${amount.toFixed(2)}`
  }
}
