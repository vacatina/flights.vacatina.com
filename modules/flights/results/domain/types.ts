export type ResultsSortOption =
  | "least_expensive"
  | "most_expensive"
  | "shortest_duration"
  | "longest_duration"

export type StopsFilterOption = "direct" | "max_1" | "max_2" | "any"

export interface ResultsUrlState {
  leg: number
  selected: string[]
  sort: ResultsSortOption
  stops: StopsFilterOption
  airline?: string
  flightNumber?: string
  takeoffFrom: number
  takeoffTo: number
  landingFrom: number
  landingTo: number
  after?: string
}

export interface OfferCardTimelineEvent {
  id: string
  dateTimeLabel: string
  description: string
  segmentDurationLabel?: string
  meta: string[]
}

export interface OfferCardLayover {
  id: string
  label: string
}

export interface OfferCardViewModel {
  id: string
  ownerName: string
  ownerLogoSymbolUrl: string | null
  ownerCode: string
  isExpired?: boolean
  departureTimeLabel: string
  arrivalTimeLabel: string
  arrivalDayOffset: number
  durationLabel: string
  durationMinutes: number
  stopsLabel: string
  stopsDetails: string | null
  routeLabel: string
  flightNumbersLabel: string
  totalAmountLabel: string
  totalAmountValue: number
  totalCurrency: string
  totalMoney: SerializedMoney
  takeoffMinutes: number
  landingMinutes: number
  timeline: OfferCardTimelineEvent[]
  layovers: OfferCardLayover[]
  filterTokens: {
    airline: string
    flightNumbers: string
  }
}

export interface ResultsSearchSummary {
  title: string
  routeLabel: string
  dateRangeLabel: string
  passengersLabel: string
  cabinLabel: string
}

export interface FareOptionsPageData {
  partialOfferRequestId: string
  leg: number
  totalLegs: number
  selected: string[]
  editSearchHref: string
  breadcrumbs: string[]
  searchSummary: ResultsSearchSummary
  offerExpiresAtIso: string | null
  offerExpiresAtLabel: string | null
  offers: OfferCardViewModel[]
  airlines: string[]
  after: string | null
  state: ResultsUrlState
}
import type { SerializedMoney } from "@/modules/currency/domain"
