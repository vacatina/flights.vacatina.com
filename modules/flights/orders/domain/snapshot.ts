import { format, isValid, parseISO } from "date-fns"

import { currencyMinorUnit } from "@/modules/flights/pricing/domain"
import type {
  BookingDetailModel,
  BookingListItem,
  BuildFlightOrderSnapshotInput,
  FlightOrderSnapshot,
} from "@/modules/flights/orders/domain/types"
import type { FlightOrderRecord } from "@/modules/flights/checkout/server/order-repository"

export function buildFlightOrderSnapshot(
  input: BuildFlightOrderSnapshotInput
): FlightOrderSnapshot {
  const firstSlice = input.offer.slices[0]
  const firstSegment = firstSlice?.segments[0]
  const firstPassenger = firstSegment?.passengers[0]
  const firstOrigin = firstSlice?.origin.iata_code ?? "--"
  const firstDestination = firstSlice?.destination.iata_code ?? "--"

  return {
    schemaVersion: 1,
    journeyTypeLabel:
      input.offer.slices.length === 1
        ? "One way"
        : input.offer.slices.length === 2
          ? "Return"
          : "Multi-leg",
    routeLabel: `${firstOrigin} ⇄ ${firstDestination}`,
    passengerCount: input.offer.passengers.length,
    cabinClassLabel: firstPassenger?.cabin_class
      ? formatCabinClass(firstPassenger.cabin_class)
      : "Economy",
    currency: input.currency,
    sellAmount: input.sellAmount,
    sellAmountLabel: formatCurrencyAmount(input.sellAmount, input.currency),
    createdAtIso: (input.now ?? new Date()).toISOString(),
    legs: input.offer.slices.map((slice, legIndex) => {
      const firstLegSegment = slice.segments[0]
      const lastLegSegment = slice.segments[slice.segments.length - 1]
      const departureAt = parseDateTime(firstLegSegment?.departing_at)
      const arrivalAt = parseDateTime(lastLegSegment?.arriving_at)
      const ownerName = input.offer.owner.name ?? "Unknown airline"

      return {
        legIndex,
        title:
          input.offer.slices.length === 1
            ? "Selected flight"
            : legIndex === 0
              ? "Outbound"
              : legIndex === 1
                ? "Inbound"
                : `Leg ${legIndex + 1}`,
        ownerName,
        ownerLogoSymbolUrl: input.offer.owner.logo_symbol_url ?? null,
        departureIata: firstLegSegment?.origin.iata_code ?? "--",
        arrivalIata: lastLegSegment?.destination.iata_code ?? "--",
        routeLabel: `${firstLegSegment?.origin.iata_code ?? "--"} - ${
          lastLegSegment?.destination.iata_code ?? "--"
        }`,
        departureAtIso: departureAt?.toISOString() ?? null,
        arrivalAtIso: arrivalAt?.toISOString() ?? null,
        departureLabel: departureAt
          ? format(departureAt, "EEE, d MMM yyyy, HH:mm")
          : "Departure time unavailable",
        arrivalLabel: arrivalAt
          ? format(arrivalAt, "EEE, d MMM yyyy, HH:mm")
          : "Arrival time unavailable",
        durationLabel: formatIsoDuration(slice.duration),
        stopsLabel:
          slice.segments.length <= 1
            ? "Non-stop"
            : `${slice.segments.length - 1} stop${slice.segments.length > 2 ? "s" : ""}`,
      }
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

export function mapFlightOrderToDetailModel(order: FlightOrderRecord): BookingDetailModel {
  const snapshot = normalizeSnapshot(order.orderSnapshot)

  return {
    bookingReference: order.bookingReference,
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
    snapshot,
  }
}

export function normalizeSnapshot(snapshot: unknown): FlightOrderSnapshot {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
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
      legs: [],
    }
  }

  const raw = snapshot as Partial<FlightOrderSnapshot>
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
    sellAmount: typeof raw.sellAmount === "number" ? raw.sellAmount : 0,
    sellAmountLabel: raw.sellAmountLabel ?? "USD0.00",
    createdAtIso: raw.createdAtIso ?? new Date(0).toISOString(),
    legs: Array.isArray(raw.legs)
      ? raw.legs.filter((item): item is FlightOrderSnapshot["legs"][number] => {
          return Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as { legIndex?: unknown }).legIndex === "number"
          )
        })
      : [],
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

function parseDateTime(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

function formatCabinClass(value: string) {
  return value
    .split("_")
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ")
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
