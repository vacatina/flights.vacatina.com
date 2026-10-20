import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { holidayPackages } from "@/modules/holidays/data"
import { HolidayCard } from "@/modules/holidays/ui/holiday-card"

export function HolidayPackagesHomeSection() {
  const featured = holidayPackages.slice(0, 4)

  return (
    <section
      aria-labelledby="holiday-home-title"
      className="bg-[#FAFAFA] py-16 md:py-20"
    >
      <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#1B1464] uppercase">
              Holiday Packages
            </p>
            <h2
              id="holiday-home-title"
              className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[#111] md:text-[40px]"
            >
              Curated trips, ready to make your own
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#525252]">
              Explore existing Vacatina itineraries, then tailor the details
              around your dates and travel party.
            </p>
          </div>
          <Link
            href="/holiday-packages"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#1B1464] underline-offset-4 hover:underline"
          >
            Explore all holiday packages
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((holiday) => (
            <HolidayCard key={holiday.id} holiday={holiday} />
          ))}
        </div>

        <p className="mt-5 text-xs leading-6 text-[#525252]">
          Package content is curated by Vacatina. Final availability and any
          bookable pricing are confirmed after travel details are selected.
        </p>
      </div>
    </section>
  )
}
