export const JOURNEY_TYPES = ["one_way", "return", "multi_city"] as const

export const CABIN_CLASSES = [
  "economy",
  "premium_economy",
  "business",
  "first",
] as const

export const MIN_MULTI_CITY_SLICES = 2
export const MAX_MULTI_CITY_SLICES = 6

export const MIN_ADULTS = 1
export const MAX_TOTAL_PASSENGERS = 9

export const SLIDER_TIME_MIN = 0
export const SLIDER_TIME_MAX = 23 * 60 + 59
