import type { HolidayPackage } from "./types"
import media from "../data/media.json"

export function holidayImage(file?: string) {
  return file ? (media as Record<string, string>)[file] : undefined
}

export function holidayPrice(price: HolidayPackage["price"]) {
  if (price.mode === "on-request" || price.amount === null) return "On request"
  const amount = new Intl.NumberFormat("en", {
    style: "currency",
    currency: price.currency,
    maximumFractionDigits: 0,
  }).format(price.amount)
  return price.mode === "from" ? `From ${amount}` : amount
}

export function holidayExcerpt(summary: string) {
  return summary
    .split(/(?<=\.)\s+/)
    .slice(0, 2)
    .join(" ")
}

export function holidayLabel(value: string) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export type HolidayFilters = {
  category: string
  duration: string
  activity: string
}

export function filterHolidays(
  packages: HolidayPackage[],
  filters: HolidayFilters
) {
  return packages.filter((holiday) => {
    const days = holiday.duration.days
    const durationMatches =
      filters.duration === "all" ||
      (filters.duration === "short" && days <= 5) ||
      (filters.duration === "week" && days >= 6 && days <= 10) ||
      (filters.duration === "long" && days >= 11)
    return (
      (filters.category === "all" || holiday.category === filters.category) &&
      (filters.activity === "all" ||
        holiday.activityLevel === filters.activity) &&
      durationMatches
    )
  })
}
