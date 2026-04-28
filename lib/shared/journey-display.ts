export type JourneyDisplayType = "one_way" | "return" | "multi_city"

export interface JourneyDisplaySlice {
  originIataCode: string | null | undefined
  destinationIataCode: string | null | undefined
}

const JOURNEY_TYPE_LABELS: Record<JourneyDisplayType, string> = {
  one_way: "One way",
  return: "Return",
  multi_city: "Multi-city",
}

export function inferJourneyTypeFromSlices(
  slices: readonly JourneyDisplaySlice[]
): JourneyDisplayType {
  if (slices.length <= 1) {
    return "one_way"
  }

  if (slices.length === 2 && isReturnPattern(slices[0], slices[1])) {
    return "return"
  }

  return "multi_city"
}

export function getJourneyTypeLabelFromSlices(
  slices: readonly JourneyDisplaySlice[]
) {
  return getJourneyTypeLabel(inferJourneyTypeFromSlices(slices))
}

export function getJourneyTypeLabel(journeyType: JourneyDisplayType) {
  return JOURNEY_TYPE_LABELS[journeyType]
}

export function buildJourneyRouteSummary(
  slices: readonly JourneyDisplaySlice[]
) {
  const firstSlice = slices[0]

  if (!firstSlice) {
    return "Route unavailable"
  }

  const firstOrigin = normalizeIataCode(firstSlice.originIataCode)
  const firstDestination = normalizeIataCode(firstSlice.destinationIataCode)
  const journeyType = inferJourneyTypeFromSlices(slices)

  if (journeyType !== "multi_city") {
    return `${firstOrigin} ⇄ ${firstDestination}`
  }

  const lastDestination = normalizeIataCode(
    slices[slices.length - 1]?.destinationIataCode
  )
  const legCount = slices.length

  return `${firstOrigin} → ${lastDestination} · ${legCount} leg${
    legCount > 1 ? "s" : ""
  }`
}

export function getJourneyLegTitle(input: {
  journeyType: JourneyDisplayType
  legIndex: number
  totalLegs: number
  singleLegTitle: string
}) {
  if (input.totalLegs <= 1) {
    return input.singleLegTitle
  }

  if (input.journeyType === "return" && input.totalLegs === 2) {
    if (input.legIndex === 0) {
      return "Outbound"
    }

    if (input.legIndex === 1) {
      return "Inbound"
    }
  }

  return `Leg ${input.legIndex + 1}`
}

function isReturnPattern(
  firstSlice: JourneyDisplaySlice,
  secondSlice: JourneyDisplaySlice
) {
  const firstOrigin = normalizeIataCode(firstSlice.originIataCode)
  const firstDestination = normalizeIataCode(firstSlice.destinationIataCode)
  const secondOrigin = normalizeIataCode(secondSlice.originIataCode)
  const secondDestination = normalizeIataCode(secondSlice.destinationIataCode)

  if (
    firstOrigin === "--" ||
    firstDestination === "--" ||
    secondOrigin === "--" ||
    secondDestination === "--"
  ) {
    return false
  }

  return (
    firstOrigin === secondDestination && firstDestination === secondOrigin
  )
}

function normalizeIataCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase()

  if (!normalized) {
    return "--"
  }

  return normalized
}
