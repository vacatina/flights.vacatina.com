import {
  SLIDER_TIME_MAX,
  SLIDER_TIME_MIN,
} from "@/modules/flights/search/domain/constants"
import type { TimeRangeInput } from "@/modules/flights/search/domain/types"

export type SliderRange = [number, number]

export function minutesToClockTime(minutesTotal: number): string {
  const safeMinutes = clamp(minutesTotal)
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function clockTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number)
  return clamp(hours * 60 + minutes)
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

function clamp(value: number): number {
  return Math.min(Math.max(value, SLIDER_TIME_MIN), SLIDER_TIME_MAX)
}

function normalizeRange([from, to]: SliderRange): SliderRange {
  if (from <= to) {
    return [clamp(from), clamp(to)]
  }

  return [clamp(to), clamp(from)]
}
