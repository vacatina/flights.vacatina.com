import { differenceInMinutes, format, isValid, parseISO } from "date-fns"

import { currencyMinorUnit } from "@/modules/flights/pricing/domain"
import {
  buildJourneyRouteSummary,
  getJourneyLegTitle,
  getJourneyTypeLabelFromSlices,
  inferJourneyTypeFromSlices,
} from "@/lib/shared/journey-display"
import type {
  BookingDetailModel,
  BookingDetailNotificationItem,
  BookingListItem,
  BuildFlightOrderSnapshotInput,
  FlightOrderSnapshot,
  FlightOrderSnapshotBookedService,
  FlightOrderSnapshotConditionsSummary,
  FlightOrderSnapshotLayover,
  FlightOrderSnapshotMetadataEntry,
  FlightOrderSnapshotPassenger,
  FlightOrderSnapshotTicketDocument,
  FlightOrderSnapshotTimelineEvent,
} from "@/modules/flights/orders/domain/types"
import type { FlightOrderRecord } from "@/modules/flights/checkout/server/order-repository"

interface BookingDetailMapContext {
  checkoutSession: {
    status: string
    paymentProvider: string | null
    providerOrderId: string | null
    providerPaymentId: string | null
    providerStatusCode: string | null
    providerStatusMessage: string | null
    paymentCurrency: string | null
    paymentAmount: number | null
    fxSourceCurrency: string | null
    fxTargetCurrency: string | null
    fxEffectiveRate: number | null
    errorMessage: string | null
  } | null
  notifications: Array<{
    id: string
    eventType: BookingDetailNotificationItem["eventType"]
    status: BookingDetailNotificationItem["status"]
    createdAt: Date
    sentAt: Date | null
    lastError: string | null
  }>
}

type OfferSegment = BuildFlightOrderSnapshotInput["offer"]["slices"][number]["segments"][number]

export function buildFlightOrderSnapshot(
  input: BuildFlightOrderSnapshotInput
): FlightOrderSnapshot {
  const firstSlice = input.offer.slices[0]
  const firstSegment = firstSlice?.segments[0]
  const firstPassenger = firstSegment?.passengers[0]
  const journeySlices = input.offer.slices.map((slice) => ({
    originIataCode: slice.origin.iata_code,
    destinationIataCode: slice.destination.iata_code,
  }))
  const journeyType = inferJourneyTypeFromSlices(journeySlices)
  const fallbackCabinLabel = firstPassenger?.cabin_class
    ? formatCabinClass(firstPassenger.cabin_class)
    : "Economy"
  const sellAmountLabel = formatCurrencyAmount(input.sellAmount, input.currency)

  return {
    schemaVersion: 1,
    journeyTypeLabel: getJourneyTypeLabelFromSlices(journeySlices),
    routeLabel: buildJourneyRouteSummary(journeySlices),
    passengerCount: input.offer.passengers.length,
    cabinClassLabel: fallbackCabinLabel,
    currency: input.currency,
    sellAmount: input.sellAmount,
    sellAmountLabel,
    createdAtIso: (input.now ?? new Date()).toISOString(),
    airlineBookingReference: input.order?.booking_reference ?? null,
    availableActions: Array.isArray(input.order?.available_actions)
      ? [...input.order.available_actions]
      : [],
    ticketDocuments: createTicketDocuments(input.order),
    bookedServices: createBookedServices(input.order),
    metadataEntries: createMetadataEntries(input.order),
    conditions: createConditionsSummary(input.order),
    legs: input.offer.slices.map((slice, legIndex) => {
      const firstLegSegment = slice.segments[0]
      const lastLegSegment = slice.segments[slice.segments.length - 1]
      const departureAt = parseDateTime(firstLegSegment?.departing_at)
      const arrivalAt = parseDateTime(lastLegSegment?.arriving_at)
      const ownerName = input.offer.owner.name ?? "Unknown airline"
      const routeLabel = `${firstLegSegment?.origin.iata_code ?? "--"} - ${
        lastLegSegment?.destination.iata_code ?? "--"
      }`
      const timeline = createTimeline(slice.segments, ownerName, fallbackCabinLabel)
      const layovers = createLayovers(slice.segments)
      const fareBrandLabel = firstLegSegment?.passengers[0]?.fare_basis_code
      const subtitle = [slice.fare_brand_name ?? null, ownerName]
        .filter((item): item is string => Boolean(item && item.trim()))
        .join(" · ")
      const stopsLabel =
        slice.segments.length <= 1
          ? "Non-stop"
          : `${slice.segments.length - 1} stop${slice.segments.length > 2 ? "s" : ""}`

      return {
        legIndex,
        title: getJourneyLegTitle({
          journeyType,
          legIndex,
          totalLegs: input.offer.slices.length,
          singleLegTitle: "Selected flight",
        }),
        ownerName,
        ownerLogoSymbolUrl: input.offer.owner.logo_symbol_url ?? null,
        departureIata: firstLegSegment?.origin.iata_code ?? "--",
        arrivalIata: lastLegSegment?.destination.iata_code ?? "--",
        routeLabel,
        subtitle: subtitle || `${fallbackCabinLabel}${fareBrandLabel ? ` · ${fareBrandLabel}` : ""}`,
        departureTimeLabel: departureAt ? format(departureAt, "HH:mm") : "--:--",
        arrivalTimeLabel: arrivalAt ? format(arrivalAt, "HH:mm") : "--:--",
        departureAtIso: departureAt?.toISOString() ?? null,
        arrivalAtIso: arrivalAt?.toISOString() ?? null,
        departureLabel: departureAt
          ? format(departureAt, "EEE, d MMM yyyy, HH:mm")
          : "Departure time unavailable",
        arrivalLabel: arrivalAt
          ? format(arrivalAt, "EEE, d MMM yyyy, HH:mm")
          : "Arrival time unavailable",
        durationLabel: formatIsoDuration(slice.duration),
        stopsLabel,
        stopsDetails: routeLabel,
        timeline,
        layovers,
      }
    }),
    passengers: createSnapshotPassengers({
      offerPassengers: input.offer.passengers,
      travelers: input.travelers ?? [],
      contact: input.contact,
    }),
    billingSummary: createBillingSummary({
      offer: input.offer,
      currency: input.currency,
      totalAmountLabel: sellAmountLabel,
    }),
  }
}

export function mapFlightOrderToListItem(order: FlightOrderRecord): BookingListItem {
  const snapshot = normalizeSnapshot(order.orderSnapshot)
  return {
    bookingReference: order.bookingReference,
    routeLabel: snapshot.routeLabel ?? `${order.partialOfferRequestId}`,
    createdAtLabel: format(order.createdAt, "d MMM yyyy, HH:mm"),
    paymentMode: order.paymentMode,
    statusLabel: toStatusLabel(order),
    sellAmountLabel: formatCurrencyAmount(order.sellAmount, order.currency),
  }
}

export function mapFlightOrderToDetailModel(
  order: FlightOrderRecord,
  context?: BookingDetailMapContext
): BookingDetailModel {
  const snapshot = normalizeSnapshot(order.orderSnapshot)
  const checkoutSession = context?.checkoutSession ?? null
  const notifications = normalizeDetailNotifications(context?.notifications ?? [])

  return {
    bookingReference: order.bookingReference,
    checkoutSessionId: order.checkoutSessionId,
    duffelOrderId: order.duffelOrderId,
    paymentMode: order.paymentMode,
    statusLabel: toStatusLabel(order),
    contactEmail: order.contactEmail,
    createdAtLabel: format(order.createdAt, "d MMM yyyy, HH:mm"),
    paymentRequiredByLabel: order.paymentRequiredBy
      ? format(order.paymentRequiredBy, "d MMM yyyy, HH:mm")
      : null,
    priceGuaranteeExpiresAtLabel: order.priceGuaranteeExpiresAt
      ? format(order.priceGuaranteeExpiresAt, "d MMM yyyy, HH:mm")
      : null,
    paidAtLabel: order.paidAt ? format(order.paidAt, "d MMM yyyy, HH:mm") : null,
    checkoutSessionStatus: checkoutSession?.status ?? null,
    paymentProvider: checkoutSession?.paymentProvider ?? null,
    providerOrderId: checkoutSession?.providerOrderId ?? null,
    providerPaymentId: checkoutSession?.providerPaymentId ?? null,
    providerStatusCode: checkoutSession?.providerStatusCode ?? null,
    providerStatusMessage: checkoutSession?.providerStatusMessage ?? null,
    paymentCurrency: checkoutSession?.paymentCurrency ?? null,
    paymentAmountLabel:
      checkoutSession?.paymentAmount !== null &&
      checkoutSession?.paymentAmount !== undefined &&
      checkoutSession.paymentCurrency
        ? formatCurrencyAmount(
            checkoutSession.paymentAmount,
            checkoutSession.paymentCurrency
          )
        : null,
    fxSourceCurrency: checkoutSession?.fxSourceCurrency ?? null,
    fxTargetCurrency: checkoutSession?.fxTargetCurrency ?? null,
    fxEffectiveRate: checkoutSession?.fxEffectiveRate ?? null,
    checkoutErrorMessage: checkoutSession?.errorMessage ?? null,
    notifications,
    snapshot,
  }
}

export function normalizeSnapshot(snapshot: unknown): FlightOrderSnapshot {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return createFallbackSnapshot()
  }

  const raw = snapshot as Partial<FlightOrderSnapshot>
  const sellAmount = typeof raw.sellAmount === "number" ? raw.sellAmount : 0
  const sellAmountLabel = raw.sellAmountLabel ?? "USD0.00"

  return {
    schemaVersion: 1,
    journeyTypeLabel: raw.journeyTypeLabel ?? "Trip",
    routeLabel: raw.routeLabel ?? "Route unavailable",
    passengerCount:
      typeof raw.passengerCount === "number" && raw.passengerCount >= 0
        ? raw.passengerCount
        : 0,
    cabinClassLabel: raw.cabinClassLabel ?? "Cabin unavailable",
    currency: raw.currency ?? "USD",
    sellAmount,
    sellAmountLabel,
    createdAtIso: raw.createdAtIso ?? new Date(0).toISOString(),
    airlineBookingReference:
      typeof raw.airlineBookingReference === "string" && raw.airlineBookingReference.trim()
        ? raw.airlineBookingReference
        : null,
    availableActions: normalizeStringArray(raw.availableActions),
    ticketDocuments: normalizeTicketDocuments(raw.ticketDocuments),
    bookedServices: normalizeBookedServices(raw.bookedServices),
    metadataEntries: normalizeMetadataEntries(raw.metadataEntries),
    conditions: normalizeConditionsSummary(raw.conditions),
    legs: normalizeLegs(raw.legs),
    passengers: normalizePassengers(raw.passengers),
    billingSummary: normalizeBillingSummary(raw.billingSummary, sellAmountLabel),
  }
}

function createTimeline(
  segments: BuildFlightOrderSnapshotInput["offer"]["slices"][number]["segments"],
  ownerName: string,
  fallbackCabinLabel: string
): FlightOrderSnapshotTimelineEvent[] {
  const timeline: FlightOrderSnapshotTimelineEvent[] = []

  for (const segment of segments) {
    const departureAt = parseDateTime(segment.departing_at)
    const arrivalAt = parseDateTime(segment.arriving_at)
    const segmentDuration = toDurationMinutes(segment.duration)

    timeline.push({
      id: `${segment.id}-depart`,
      dateTimeLabel: departureAt
        ? format(departureAt, "EEE, dd MMM yyyy, HH:mm")
        : "Date unavailable",
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
      dateTimeLabel: arrivalAt ? format(arrivalAt, "EEE, dd MMM yyyy, HH:mm") : "Date unavailable",
      description: withTerminal(
        `Arrive at ${segment.destination.name} (${segment.destination.iata_code})`,
        segment.destination_terminal
      ),
      meta: createSegmentMeta(segment, ownerName, fallbackCabinLabel),
    })
  }

  return timeline
}

function createLayovers(
  segments: BuildFlightOrderSnapshotInput["offer"]["slices"][number]["segments"]
): FlightOrderSnapshotLayover[] {
  if (segments.length <= 1) {
    return []
  }

  const layovers: FlightOrderSnapshotLayover[] = []

  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1]
    const current = segments[index]
    const currentDepartureAt = parseDateTime(current.departing_at)
    const previousArrivalAt = parseDateTime(previous.arriving_at)
    const layoverMinutes =
      currentDepartureAt && previousArrivalAt
        ? Math.max(0, differenceInMinutes(currentDepartureAt, previousArrivalAt))
        : 0

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
  segment: OfferSegment,
  ownerName: string,
  fallbackCabinLabel: string
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
  const cabinLabel = firstPassenger?.cabin_class
    ? formatCabinClass(firstPassenger.cabin_class)
    : fallbackCabinLabel
  const meta = [cabinLabel, ownerName, aircraftName, flightCode].filter(
    (value): value is string => Boolean(value && value.trim())
  )

  if (carryOnCount > 0) {
    meta.push(`${carryOnCount} carry-on bag${carryOnCount > 1 ? "s" : ""}`)
  }

  if (checkedCount > 0) {
    meta.push(`${checkedCount} checked bag${checkedCount > 1 ? "s" : ""}`)
  }

  return meta
}

function formatFlightCode(segment: OfferSegment) {
  const carrierCode = segment.marketing_carrier?.iata_code?.trim() ?? ""
  const flightNumber = segment.marketing_carrier_flight_number?.trim() ?? ""

  if (carrierCode && flightNumber) {
    return `${carrierCode}${flightNumber}`
  }

  return carrierCode || flightNumber || "Flight unavailable"
}

function createSnapshotPassengers(input: {
  offerPassengers: BuildFlightOrderSnapshotInput["offer"]["passengers"]
  travelers: NonNullable<BuildFlightOrderSnapshotInput["travelers"]>
  contact: BuildFlightOrderSnapshotInput["contact"]
}): FlightOrderSnapshotPassenger[] {
  type SnapshotTraveler = {
    id: string
    type: "adult" | "child" | "infant_without_seat"
    title?: string
    givenName?: string
    familyName?: string
    bornOn?: string
    gender?: string
    email?: string
    phoneNumber?: string
  }

  const travelers: SnapshotTraveler[] =
    input.travelers.length > 0
      ? input.travelers.map<SnapshotTraveler>((traveler) => ({
          id: traveler.id,
          type: normalizePassengerType(traveler.type),
          title: traveler.title,
          givenName: traveler.givenName,
          familyName: traveler.familyName,
          bornOn: traveler.bornOn,
          gender: traveler.gender,
          email: traveler.email,
          phoneNumber: traveler.phoneNumber,
        }))
      : input.offerPassengers.map<SnapshotTraveler>((passenger) => ({
          id: passenger.id,
          type: normalizePassengerType(passenger.type),
          title: undefined,
          givenName: undefined,
          familyName: undefined,
          bornOn: undefined,
          gender: undefined,
          email: undefined,
          phoneNumber: undefined,
        }))
  const counters = new Map<string, number>()

  return travelers.map((traveler) => {
    const typeLabel = toPassengerTypeLabel(traveler.type)
    const currentCount = counters.get(typeLabel) ?? 0
    const nextCount = currentCount + 1
    counters.set(typeLabel, nextCount)
    const fullName = [traveler.title, traveler.givenName, traveler.familyName]
      .filter((item): item is string => Boolean(item && item.trim()))
      .join(" ")
      .trim()
    const bornOn = traveler.bornOn?.trim()
    const bornOnLabel = bornOn ? formatDateOrFallback(bornOn, "dd/MM/yyyy") : null

    return {
      id: traveler.id,
      label: `${typeLabel} ${nextCount}`,
      typeLabel,
      fullName: fullName || null,
      dateOfBirthLabel: bornOnLabel,
      genderLabel: traveler.gender ? toGenderLabel(traveler.gender) : null,
      email: traveler.email?.trim() || input.contact?.email?.trim() || null,
      phoneNumber: traveler.phoneNumber?.trim() || input.contact?.phoneNumber?.trim() || null,
    }
  })
}

function createBillingSummary(input: {
  offer: BuildFlightOrderSnapshotInput["offer"]
  currency: string
  totalAmountLabel: string
}) {
  const fareAmount = parseMoney(input.offer.base_amount)
  const taxesAmount = parseMoney(input.offer.tax_amount)

  return {
    fareAmountLabel:
      fareAmount === null ? null : formatCurrencyAmount(fareAmount, input.currency),
    taxesAmountLabel:
      taxesAmount === null ? null : formatCurrencyAmount(taxesAmount, input.currency),
    totalAmountLabel: input.totalAmountLabel,
  }
}

function createTicketDocuments(
  order: BuildFlightOrderSnapshotInput["order"]
): FlightOrderSnapshotTicketDocument[] {
  if (!order || !Array.isArray(order.documents)) {
    return []
  }

  return order.documents
    .filter(
      (document): document is NonNullable<typeof order.documents>[number] =>
        Boolean(document && document.unique_identifier && document.type)
    )
    .map((document) => ({
      uniqueIdentifier: document.unique_identifier,
      type: document.type,
      passengerIds: Array.isArray(document.passenger_ids) ? [...document.passenger_ids] : [],
    }))
}

function createBookedServices(
  order: BuildFlightOrderSnapshotInput["order"]
): FlightOrderSnapshotBookedService[] {
  if (!order || !Array.isArray(order.services)) {
    return []
  }

  return order.services
    .filter((service): service is NonNullable<typeof order.services>[number] => Boolean(service && service.id))
    .map((service) => ({
      id: service.id,
      type: service.type,
      totalAmountLabel: formatCurrencyAmount(
        parseMoney(service.total_amount) ?? 0,
        service.total_currency
      ),
      passengerIds: Array.isArray(service.passenger_ids) ? [...service.passenger_ids] : [],
      segmentIds: Array.isArray(service.segment_ids) ? [...service.segment_ids] : [],
    }))
}

function createMetadataEntries(
  order: BuildFlightOrderSnapshotInput["order"]
): FlightOrderSnapshotMetadataEntry[] {
  if (!order || !order.metadata || typeof order.metadata !== "object") {
    return []
  }

  return Object.entries(order.metadata)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([key, value]) => ({
      key,
      value,
    }))
}

function createConditionsSummary(
  order: BuildFlightOrderSnapshotInput["order"]
): FlightOrderSnapshotConditionsSummary {
  return {
    changes: formatConditionSummaryLine(order?.conditions?.change_before_departure, "change"),
    refunds: formatConditionSummaryLine(order?.conditions?.refund_before_departure, "refund"),
  }
}

function formatConditionSummaryLine(
  condition: unknown,
  type: "change" | "refund"
) {
  const noDataText = type === "change" ? "No data on changes" : "No data on refunds"
  const allowedText = type === "change" ? "Changes allowed" : "Refunds allowed"
  const deniedText = type === "change" ? "Changes not allowed" : "Refunds not allowed"

  if (!condition || typeof condition !== "object") {
    return noDataText
  }

  const typed = condition as {
    allowed?: boolean
    penalty_amount?: string | null
    penalty_currency?: string | null
  }

  if (typed.allowed === false) {
    return deniedText
  }

  if (typed.allowed !== true) {
    return noDataText
  }

  const penaltyAmount = parseMoney(typed.penalty_amount)
  const penaltyCurrency = typed.penalty_currency?.trim().toUpperCase()

  if (
    penaltyAmount !== null &&
    penaltyCurrency &&
    penaltyAmount > 0
  ) {
    return `${allowedText} with ${formatCurrencyAmount(penaltyAmount, penaltyCurrency)} fee`
  }

  return allowedText
}

function normalizeLegs(rawLegs: unknown): FlightOrderSnapshot["legs"] {
  if (!Array.isArray(rawLegs)) {
    return []
  }

  return rawLegs
    .filter((item): item is FlightOrderSnapshot["legs"][number] => {
      return Boolean(
        item && typeof item === "object" && typeof (item as { legIndex?: unknown }).legIndex === "number"
      )
    })
    .map((leg) => ({
      legIndex: leg.legIndex,
      title: leg.title ?? `Leg ${leg.legIndex + 1}`,
      ownerName: leg.ownerName ?? "Unknown airline",
      ownerLogoSymbolUrl: leg.ownerLogoSymbolUrl ?? null,
      departureIata: leg.departureIata ?? "--",
      arrivalIata: leg.arrivalIata ?? "--",
      routeLabel: leg.routeLabel ?? `${leg.departureIata ?? "--"} - ${leg.arrivalIata ?? "--"}`,
      subtitle: leg.subtitle ?? `${leg.ownerName ?? "Unknown airline"}`,
      departureTimeLabel: leg.departureTimeLabel ?? "--:--",
      arrivalTimeLabel: leg.arrivalTimeLabel ?? "--:--",
      departureAtIso: leg.departureAtIso ?? null,
      arrivalAtIso: leg.arrivalAtIso ?? null,
      departureLabel: leg.departureLabel ?? "Departure time unavailable",
      arrivalLabel: leg.arrivalLabel ?? "Arrival time unavailable",
      durationLabel: leg.durationLabel ?? "00h 00m",
      stopsLabel: leg.stopsLabel ?? "N/A",
      stopsDetails: leg.stopsDetails ?? leg.routeLabel ?? "-- - --",
      timeline: Array.isArray(leg.timeline) ? leg.timeline : [],
      layovers: Array.isArray(leg.layovers) ? leg.layovers : [],
    }))
}

function normalizePassengers(rawPassengers: unknown): FlightOrderSnapshotPassenger[] {
  if (!Array.isArray(rawPassengers)) {
    return []
  }

  return rawPassengers
    .filter((item): item is FlightOrderSnapshotPassenger => {
      return Boolean(item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string")
    })
    .map((passenger, index) => ({
      id: passenger.id,
      label: passenger.label ?? `Passenger ${index + 1}`,
      typeLabel: passenger.typeLabel ?? "Passenger",
      fullName: passenger.fullName ?? null,
      dateOfBirthLabel: passenger.dateOfBirthLabel ?? null,
      genderLabel: passenger.genderLabel ?? null,
      email: passenger.email ?? null,
      phoneNumber: passenger.phoneNumber ?? null,
    }))
}

function normalizeBillingSummary(
  rawBillingSummary: unknown,
  defaultTotalAmountLabel: string
): FlightOrderSnapshot["billingSummary"] {
  if (!rawBillingSummary || typeof rawBillingSummary !== "object" || Array.isArray(rawBillingSummary)) {
    return {
      fareAmountLabel: null,
      taxesAmountLabel: null,
      totalAmountLabel: defaultTotalAmountLabel,
    }
  }

  const typed = rawBillingSummary as Partial<FlightOrderSnapshot["billingSummary"]>
  return {
    fareAmountLabel: typed.fareAmountLabel ?? null,
    taxesAmountLabel: typed.taxesAmountLabel ?? null,
    totalAmountLabel: typed.totalAmountLabel ?? defaultTotalAmountLabel,
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

function normalizeTicketDocuments(value: unknown): FlightOrderSnapshotTicketDocument[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (item): item is FlightOrderSnapshotTicketDocument =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof (item as { uniqueIdentifier?: unknown }).uniqueIdentifier === "string"
        )
    )
    .map((item) => ({
      uniqueIdentifier: item.uniqueIdentifier,
      type: typeof item.type === "string" && item.type.trim().length > 0 ? item.type : "unknown",
      passengerIds: normalizeStringArray(item.passengerIds),
    }))
}

function normalizeBookedServices(value: unknown): FlightOrderSnapshotBookedService[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (item): item is FlightOrderSnapshotBookedService =>
        Boolean(item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string")
    )
    .map((item) => ({
      id: item.id,
      type: typeof item.type === "string" && item.type.trim().length > 0 ? item.type : "unknown",
      totalAmountLabel:
        typeof item.totalAmountLabel === "string" && item.totalAmountLabel.trim().length > 0
          ? item.totalAmountLabel
          : "Amount unavailable",
      passengerIds: normalizeStringArray(item.passengerIds),
      segmentIds: normalizeStringArray(item.segmentIds),
    }))
}

function normalizeMetadataEntries(value: unknown): FlightOrderSnapshotMetadataEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (item): item is FlightOrderSnapshotMetadataEntry =>
        Boolean(item && typeof item === "object" && typeof (item as { key?: unknown }).key === "string")
    )
    .map((item) => ({
      key: item.key,
      value: typeof item.value === "string" ? item.value : "",
    }))
}

function normalizeConditionsSummary(value: unknown): FlightOrderSnapshotConditionsSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      changes: "No data on changes",
      refunds: "No data on refunds",
    }
  }

  const typed = value as Partial<FlightOrderSnapshotConditionsSummary>

  return {
    changes:
      typeof typed.changes === "string" && typed.changes.trim().length > 0
        ? typed.changes
        : "No data on changes",
    refunds:
      typeof typed.refunds === "string" && typed.refunds.trim().length > 0
        ? typed.refunds
        : "No data on refunds",
  }
}

function normalizeDetailNotifications(
  notifications: BookingDetailMapContext["notifications"]
): BookingDetailNotificationItem[] {
  return notifications
    .slice()
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map((item) => ({
      id: item.id,
      eventType: item.eventType,
      status: item.status,
      createdAtLabel: format(item.createdAt, "d MMM yyyy, HH:mm"),
      sentAtLabel: item.sentAt ? format(item.sentAt, "d MMM yyyy, HH:mm") : null,
      lastError: item.lastError,
    }))
}

function createFallbackSnapshot(): FlightOrderSnapshot {
  return {
    schemaVersion: 1,
    journeyTypeLabel: "Trip",
    routeLabel: "Route unavailable",
    passengerCount: 0,
    cabinClassLabel: "Cabin unavailable",
    currency: "USD",
    sellAmount: 0,
    sellAmountLabel: "USD0.00",
    createdAtIso: new Date(0).toISOString(),
    airlineBookingReference: null,
    availableActions: [],
    ticketDocuments: [],
    bookedServices: [],
    metadataEntries: [],
    conditions: {
      changes: "No data on changes",
      refunds: "No data on refunds",
    },
    legs: [],
    passengers: [],
    billingSummary: {
      fareAmountLabel: null,
      taxesAmountLabel: null,
      totalAmountLabel: "USD0.00",
    },
  }
}

function toStatusLabel(order: FlightOrderRecord) {
  if (order.paymentMode === "hold") {
    return order.paymentAwaiting ? "On hold - payment pending" : "On hold"
  }

  if (order.paidAt) {
    return "Confirmed"
  }

  return order.paymentAwaiting ? "Payment pending" : "Confirmed"
}

function toPassengerTypeLabel(value: "adult" | "child" | "infant_without_seat") {
  switch (value) {
    case "child":
      return "Child"
    case "infant_without_seat":
      return "Infant"
    case "adult":
    default:
      return "Adult"
  }
}

function normalizePassengerType(value: unknown): "adult" | "child" | "infant_without_seat" {
  if (value === "child" || value === "infant_without_seat") {
    return value
  }

  return "adult"
}

function toGenderLabel(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized === "m" || normalized === "male") {
    return "Male"
  }

  if (normalized === "f" || normalized === "female") {
    return "Female"
  }

  return value
}

function formatIsoDuration(value: string | null | undefined) {
  if (!value || !value.startsWith("PT")) {
    return "00h 00m"
  }

  const hours = Number.parseInt((value.match(/(\d+)H/) ?? [])[1] ?? "0", 10)
  const minutes = Number.parseInt((value.match(/(\d+)M/) ?? [])[1] ?? "0", 10)
  const normalizedHours = Number.isFinite(hours) ? hours : 0
  const normalizedMinutes = Number.isFinite(minutes) ? minutes : 0

  return `${String(normalizedHours).padStart(2, "0")}h ${String(normalizedMinutes).padStart(2, "0")}m`
}

function toDurationMinutes(value: string | null | undefined) {
  if (!value || !value.startsWith("PT")) {
    return null
  }

  const hours = Number.parseInt((value.match(/(\d+)H/) ?? [])[1] ?? "0", 10)
  const minutes = Number.parseInt((value.match(/(\d+)M/) ?? [])[1] ?? "0", 10)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }

  return hours * 60 + minutes
}

function formatMinutesDuration(value: number) {
  const minutes = Math.max(0, value)
  const hoursPart = Math.floor(minutes / 60)
  const minutePart = minutes % 60

  return `${String(hoursPart).padStart(2, "0")}h ${String(minutePart).padStart(2, "0")}m`
}

function parseDateTime(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

function formatDateOrFallback(value: string, template: string) {
  const parsed = parseDateTime(value)

  if (!parsed) {
    return value
  }

  return format(parsed, template)
}

function formatCabinClass(value: string) {
  return value
    .split("_")
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ")
}

function parseMoney(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
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
