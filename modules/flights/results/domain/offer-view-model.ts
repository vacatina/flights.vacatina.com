import { differenceInCalendarDays, differenceInMinutes, format, parseISO } from "date-fns"

import { clockTimeToMinutes } from "@/modules/flights/search/domain"
import type {
  OfferCardLayover,
  OfferCardTimelineEvent,
  OfferCardViewModel,
  ResultsSearchSummary,
} from "@/modules/flights/results/domain/types"
import type { CabinClass, Offer, OfferRequest } from "@duffel/api/types"

type OfferLike = Pick<Offer, "id" | "owner" | "slices" | "total_amount" | "total_currency">

export function normalizeOfferForLeg(
  offer: OfferLike,
  leg: number,
  airlineLogosByAirlineId: Readonly<Record<string, string>> = {}
): OfferCardViewModel | null {
  const slice = offer.slices[leg] ?? offer.slices[0]

  if (!slice || slice.segments.length === 0) {
    return null
  }

  const firstSegment = slice.segments[0]
  const lastSegment = slice.segments[slice.segments.length - 1]
  const departureAt = parseISO(firstSegment.departing_at)
  const arrivalAt = parseISO(lastSegment.arriving_at)
  const departureTimeLabel = format(departureAt, "HH:mm")
  const arrivalTimeLabel = format(arrivalAt, "HH:mm")
  const arrivalDayOffset = Math.max(
    0,
    differenceInCalendarDays(arrivalAt, departureAt)
  )
  const durationMinutes =
    toDurationMinutes(slice.duration) ??
    Math.max(0, differenceInMinutes(arrivalAt, departureAt))
  const layovers = createLayovers(slice.segments)
  const firstLayover = layovers[0]
  const connections = Math.max(slice.segments.length - 1, 0)
  const ownerName =
    offer.owner.name?.trim() || offer.owner.iata_code?.trim() || "Unknown airline"
  const stopsLabel =
    connections === 0
      ? "Non-stop"
      : `${connections} stop${connections > 1 ? "s" : ""}`
  const flightNumbers = slice.segments
    .map((segment) => formatFlightCode(segment))
    .filter(Boolean)
    .join(", ")

  return {
    id: offer.id,
    ownerName,
    ownerCode: offer.owner.iata_code ?? "",
    isExpired: isOfferExpired(offer),
    ownerLogoSymbolUrl:
      airlineLogosByAirlineId[offer.owner.id] ??
      (offer.owner as { logo_symbol_url?: string | null }).logo_symbol_url ?? null,
    departureTimeLabel,
    arrivalTimeLabel,
    arrivalDayOffset,
    durationLabel: formatMinutesDuration(durationMinutes),
    durationMinutes,
    stopsLabel,
    stopsDetails: firstLayover ? firstLayover.label.replace("layover at ", "") : null,
    routeLabel: `${slice.origin.iata_code} - ${slice.destination.iata_code}`,
    flightNumbersLabel: flightNumbers,
    totalAmountLabel: `${offer.total_currency}${Number(offer.total_amount).toFixed(2)}`,
    totalAmountValue: Number(offer.total_amount),
    totalCurrency: offer.total_currency,
    takeoffMinutes: clockTimeToMinutes(departureTimeLabel),
    landingMinutes: clockTimeToMinutes(arrivalTimeLabel),
    timeline: createTimeline(slice.segments, ownerName),
    layovers,
    filterTokens: {
      airline: `${ownerName} ${offer.owner.iata_code}`.toLowerCase(),
      flightNumbers: flightNumbers.toLowerCase(),
    },
  }
}

export function formatMinutesDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes))
  const days = Math.floor(safeMinutes / (60 * 24))
  const remainderAfterDays = safeMinutes % (60 * 24)
  const hours = Math.floor(remainderAfterDays / 60)
  const minutes = remainderAfterDays % 60
  const parts: string[] = []

  if (days > 0) {
    parts.push(`${days}d`)
  }

  parts.push(`${String(hours).padStart(2, "0")}h`)
  parts.push(`${String(minutes).padStart(2, "0")}m`)

  return parts.join(" ")
}

export function toDurationMinutes(value: string | null | undefined): number | null {
  if (!value) {
    return null
  }

  const matches = value.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?$/)

  if (!matches) {
    return null
  }

  const [, days, hours, minutes] = matches
  const parsedDays = Number(days ?? 0)
  const parsedHours = Number(hours ?? 0)
  const parsedMinutes = Number(minutes ?? 0)

  return parsedDays * 24 * 60 + parsedHours * 60 + parsedMinutes
}

export function createSearchSummary(
  offerRequest: OfferRequest,
  currentLeg: number
): ResultsSearchSummary {
  const firstSlice = offerRequest.slices[0]
  const lastSlice = offerRequest.slices[offerRequest.slices.length - 1]
  const routeLabel = `${firstSlice.origin.iata_code} ⇄ ${firstSlice.destination.iata_code}`
  const title = offerRequest.slices.length > 1 ? "Round trip" : "One way"
  const dateRangeLabel =
    offerRequest.slices.length > 1
      ? `${format(parseISO(`${firstSlice.departure_date}T00:00:00Z`), "dd MMM")} - ${format(parseISO(`${lastSlice.departure_date}T00:00:00Z`), "dd MMM")}`
      : format(parseISO(`${firstSlice.departure_date}T00:00:00Z`), "dd MMM")
  const passengerCount = offerRequest.passengers.length

  return {
    title: `${title} to ${offerRequest.slices[currentLeg]?.destination.iata_code ?? firstSlice.destination.iata_code}`,
    routeLabel,
    dateRangeLabel: `${dateRangeLabel} · ${passengerCount} passenger${passengerCount > 1 ? "s" : ""}`,
    passengersLabel: `${passengerCount} passenger${passengerCount > 1 ? "s" : ""}`,
    cabinLabel: cabinClassToLabel(offerRequest.cabin_class ?? "economy"),
  }
}

export function createLegBreadcrumbs(offerRequest: OfferRequest) {
  return offerRequest.slices.map(
    (slice) => `${slice.origin.iata_code} to ${slice.destination.iata_code}`
  )
}

function cabinClassToLabel(cabinClass: CabinClass) {
  return cabinClass
    .split("_")
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ")
}

function createTimeline(
  segments: Offer["slices"][number]["segments"],
  ownerName: string
): OfferCardTimelineEvent[] {
  const timeline: OfferCardTimelineEvent[] = []

  for (const segment of segments) {
    const departureAt = parseISO(segment.departing_at)
    const arrivalAt = parseISO(segment.arriving_at)
    const segmentDuration = toDurationMinutes(segment.duration)

    timeline.push({
      id: `${segment.id}-depart`,
      dateTimeLabel: format(departureAt, "EEE, dd MMM yyyy, HH:mm"),
      description: withTerminal(
        `Depart from ${segment.origin.name} (${segment.origin.iata_code})`,
        segment.origin_terminal
      ),
      segmentDurationLabel:
        segmentDuration === null ? undefined : formatMinutesDuration(segmentDuration),
      meta: [],
    })

    timeline.push({
      id: `${segment.id}-arrive`,
      dateTimeLabel: format(arrivalAt, "EEE, dd MMM yyyy, HH:mm"),
      description: withTerminal(
        `Arrive at ${segment.destination.name} (${segment.destination.iata_code})`,
        segment.destination_terminal
      ),
      meta: createSegmentMeta(segment, ownerName),
    })
  }

  return timeline
}

function createLayovers(
  segments: Offer["slices"][number]["segments"]
): OfferCardLayover[] {
  if (segments.length <= 1) {
    return []
  }

  const layovers: OfferCardLayover[] = []

  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1]
    const current = segments[index]
    const layoverMinutes = Math.max(
      0,
      differenceInMinutes(parseISO(current.departing_at), parseISO(previous.arriving_at))
    )

    layovers.push({
      id: `${previous.id}-${current.id}-layover`,
      label: `${formatMinutesDuration(layoverMinutes)} layover at ${previous.destination.name} (${previous.destination.iata_code})`,
    })
  }

  return layovers
}

function withTerminal(label: string, terminal: string | null) {
  if (!terminal) {
    return label
  }

  return `${label}, Terminal ${terminal}`
}

function createSegmentMeta(
  segment: Offer["slices"][number]["segments"][number],
  ownerName: string
) {
  const firstPassenger = segment.passengers[0]
  const baggages = firstPassenger?.baggages ?? []
  const carryOnCount = baggages
    .filter((baggage) => baggage.type === "carry_on")
    .reduce((total, baggage) => total + baggage.quantity, 0)
  const checkedCount = baggages
    .filter((baggage) => baggage.type === "checked")
    .reduce((total, baggage) => total + baggage.quantity, 0)
  const flightCode = formatFlightCode(segment)
  const aircraftName = segment.aircraft?.name ?? segment.aircraft?.iata_code ?? undefined
  const meta = [
    cabinClassToLabel(firstPassenger?.cabin_class ?? "economy"),
    ownerName,
    aircraftName,
    flightCode,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))

  if (carryOnCount > 0) {
    meta.push(`${carryOnCount} carry-on bag${carryOnCount > 1 ? "s" : ""}`)
  }

  if (checkedCount > 0) {
    meta.push(`${checkedCount} checked bag${checkedCount > 1 ? "s" : ""}`)
  }

  return meta
}

function formatFlightCode(segment: Offer["slices"][number]["segments"][number]) {
  const carrierCode = segment.marketing_carrier?.iata_code?.trim() ?? ""
  const flightNumber = segment.marketing_carrier_flight_number?.trim() ?? ""

  if (carrierCode && flightNumber) {
    return `${carrierCode}${flightNumber}`
  }

  return carrierCode || flightNumber || "Flight unavailable"
}

function isOfferExpired(offer: OfferLike) {
  const expiresAt = (offer as { expires_at?: string | null }).expires_at

  if (!expiresAt) {
    return false
  }

  const expiresAtTime = Date.parse(expiresAt)

  if (Number.isNaN(expiresAtTime)) {
    return false
  }

  return expiresAtTime <= Date.now()
}
