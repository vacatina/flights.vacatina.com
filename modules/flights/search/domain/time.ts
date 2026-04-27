import {
  SLIDER_TIME_MAX,
  SLIDER_TIME_MIN,
} from "@/modules/flights/search/domain/constants"
import type { TimeRangeInput } from "@/modules/flights/search/domain/types"
import { clamp } from "@/lib/shared/number"

export type SliderRange = [number, number]

export function minutesToClockTime(minutesTotal: number): string {
  const safeMinutes = clamp(minutesTotal, SLIDER_TIME_MIN, SLIDER_TIME_MAX)
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function clockTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number)
  return clamp(hours * 60 + minutes, SLIDER_TIME_MIN, SLIDER_TIME_MAX)
}

export function sliderRangeToTimeRange(range: SliderRange): TimeRangeInput | null {
  const [from, to] = normalizeRange(range)

  if (from === SLIDER_TIME_MIN && to === SLIDER_TIME_MAX) {
    return null
  }

  return {
    from: minutesToClockTime(from),
    to: minutesToClockTime(to),
  }
}

export function timeRangeToSliderRange(range: TimeRangeInput | null): SliderRange {
  if (!range) {
    return [SLIDER_TIME_MIN, SLIDER_TIME_MAX]
  }

  return normalizeRange([clockTimeToMinutes(range.from), clockTimeToMinutes(range.to)])
}

export function formatTimeRange(range: TimeRangeInput | null): string {
  if (!range) {
    return "at any time"
  }

  return `${range.from} - ${range.to}`
}

function normalizeRange([from, to]: SliderRange): SliderRange {
  if (from <= to) {
    return [
      clamp(from, SLIDER_TIME_MIN, SLIDER_TIME_MAX),
      clamp(to, SLIDER_TIME_MIN, SLIDER_TIME_MAX),
    ]
  }

  return [
    clamp(to, SLIDER_TIME_MIN, SLIDER_TIME_MAX),
    clamp(from, SLIDER_TIME_MIN, SLIDER_TIME_MAX),
  ]
}
