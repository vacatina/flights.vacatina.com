"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDaysIcon, MapPinIcon } from "lucide-react"

const destinations = {
  "Sri Lanka": {
    Jan: "Generally popular for west and south coast travel; conditions vary by region.",
    Apr: "Warm inter-monsoon period with mixed regional conditions.",
    Jul: "Often considered for east coast travel and cultural-season planning.",
    Oct: "Inter-monsoon period; build flexibility into outdoor plans.",
  },
  Maldives: {
    Jan: "Commonly associated with drier beach conditions and high seasonal demand.",
    Apr: "Transition period with warm conditions and changing rainfall patterns.",
    Jul: "Wet-season travel can bring showers alongside usable beach time.",
    Oct: "Shoulder-season conditions vary; plan around forecast closer to travel.",
  },
  Bali: {
    Jan: "Wet-season travel; allow flexibility for outdoor activities.",
    Apr: "Transition into a generally drier part of the year.",
    Jul: "Popular dry-season period with stronger visitor demand.",
    Oct: "End-of-dry-season transition; conditions can begin to shift.",
  },
  Seychelles: {
    Jan: "Warmer and wetter seasonal pattern; conditions vary island by island.",
    Apr: "Transition period often associated with lighter winds.",
    Jul: "Cooler, windier seasonal pattern suited to some outdoor activities.",
    Oct: "Transition period with changing winds and rainfall patterns.",
  },
} as const

const months = ["Jan", "Apr", "Jul", "Oct"] as const

type DestinationName = keyof typeof destinations
type MonthName = (typeof months)[number]

export function SeasonalGuideSection() {
  const [destination, setDestination] = useState<DestinationName>("Sri Lanka")
  const [month, setMonth] = useState<MonthName>("Jan")

  const guidance = useMemo(
    () => destinations[destination][month],
    [destination, month]
  )

  return (
    <section
      id="seasonal-guide"
      aria-labelledby="seasonal-guide-title"
      className="mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-6 md:py-20 lg:px-8"
    >
      <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-6 md:p-10">
        <p className="text-xs font-bold tracking-[0.16em] text-[#1B1464] uppercase">
          Travel Inspiration
        </p>
        <h2
          id="seasonal-guide-title"
          className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[#111] md:text-[40px]"
        >
          Find the right time to go
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#525252]">
          A general seasonal guide for inspiration. This is not a live weather
          forecast or destination-specific travel advisory.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1B1464]">
              <MapPinIcon className="size-4" aria-hidden="true" />
              Destination
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(destinations) as DestinationName[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={destination === name}
                  onClick={() => setDestination(name)}
                  className={
                    destination === name
                      ? "min-h-11 rounded-full bg-[#1B1464] px-4 text-sm font-semibold text-white"
                      : "min-h-11 rounded-full border border-[#E5E5E5] bg-white px-4 text-sm font-semibold text-[#525252] hover:bg-[#FAFAFA]"
                  }
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#1B1464]">
              <CalendarDaysIcon className="size-4" aria-hidden="true" />
              Month
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {months.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={month === name}
                  onClick={() => setMonth(name)}
                  className={
                    month === name
                      ? "min-h-11 rounded-full bg-[#1B1464] px-4 text-sm font-semibold text-white"
                      : "min-h-11 rounded-full border border-[#E5E5E5] bg-white px-4 text-sm font-semibold text-[#525252] hover:bg-[#FAFAFA]"
                  }
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#FAFAFA] p-6">
            <p className="text-xs font-bold tracking-[0.12em] text-[#525252] uppercase">
              Seasonal guide
            </p>
            <h3 className="mt-3 font-heading text-2xl font-semibold text-[#1B1464]">
              {destination} · {month}
            </h3>
            <p className="mt-4 text-sm leading-7 text-[#525252]">{guidance}</p>
            <Link
              href="/holiday-packages"
              className="mt-6 inline-flex min-h-11 items-center rounded-[10px] bg-[#1B1464] px-5 text-sm font-semibold text-white"
            >
              Explore destinations
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
