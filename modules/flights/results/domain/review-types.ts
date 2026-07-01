export interface ReviewUrlState {
  selected: string[]
  fare: string[]
}

export interface ReviewLegHeaderViewModel {
  legIndex: number
  title: string
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
}

export interface ReviewFareOptionLine {
  id: string
  label: string
  kind: "change" | "refund" | "hold" | "carry_on" | "checked"
}

export interface ReviewFareOptionViewModel {
  key: string
  legIndex: number
  cabinLabel: string
  fareLabel: string
  lines: ReviewFareOptionLine[]
  priceFromLabel: string
  priceFromValue: number
  currency: string
  isSelected: boolean
  isSelectable: boolean
}

export interface ReviewLegSectionViewModel {
  legIndex: number
  title: string
  dateLabel: string
  header: ReviewLegHeaderViewModel
  options: ReviewFareOptionViewModel[]
  isLocked: boolean
  lockMessage?: string
}

export interface ReviewSummaryViewModel {
  soldByLabel: string
  conditions: string[]
  co2Label: string
  totalAmountLabel: string | null
  checkoutEnabled: boolean
  helperText: string
  finalOfferId: string | null
}

export interface ReviewPageData {
  partialOfferRequestId: string
  breadcrumbs: string[]
  totalLegs: number
  offerExpiresAtIso: string | null
  offerExpiresAtLabel: string | null
  state: ReviewUrlState
  legs: ReviewLegSectionViewModel[]
  summary: ReviewSummaryViewModel
}
