import Link from "next/link"
import { ArrowRightIcon, PlaneTakeoffIcon } from "lucide-react"

import { Accordion } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { FlightOfferCard } from "@/modules/flights/results/ui/flight-offer-card"
import {
  destinations,
  destinationSearchHref,
} from "@/modules/home/domain/destinations"
import { getPopularFlightOffers } from "@/modules/home/server/popular-flights"

export async function PopularFlightsSection() {
  const selection = await getPopularFlightOffers()
  const fallbackHref = destinationSearchHref(destinations[0])

  return (
    <section
      aria-labelledby="popular-flights-title"
      className="w-full mx-auto max-w-screen-2xl px-4 py-16 md:px-8 md:py-20 lg:px-12"
    >
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#1B1464] dark:text-blue-300">
            <PlaneTakeoffIcon aria-hidden="true" className="size-4" />
            Departing from Colombo
          </div>
          <h2
            id="popular-flights-title"
            className="text-3xl font-semibold tracking-[-0.035em] text-foreground md:text-[38px]"
          >
            Popular flights from Colombo
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {selection
              ? `Current one-way offers to ${selection.destinationCity} for ${selection.departureDateLabel}.`
              : "Explore Colombo to Dubai and choose your dates for current fares."}
          </p>
        </div>
        <Link
          href={selection?.fareOptionsHref ?? fallbackHref}
          prefetch={false}
          className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-[#1B1464] underline-offset-4 hover:underline dark:text-blue-300"
        >
          Search more flights
          <ArrowRightIcon
            aria-hidden="true"
            className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
          />
        </Link>
      </div>

      {selection ? (
        <Accordion multiple className="gap-5">
          {selection.offers.map((offer) => (
            <FlightOfferCard
              key={offer.id}
              offer={offer}
              action={
                <Button
                  nativeButton={false}
                  render={
                    <Link
                      href={`/results/${selection.partialOfferRequestId}/review?selected=${encodeURIComponent(offer.id)}`}
                      prefetch={false}
                      aria-label={`Select ${offer.ownerName} flight from ${offer.routeLabel}`}
                    />
                  }
                  className="h-11 rounded-xl px-7 text-sm"
                >
                  Select
                </Button>
              }
            />
          ))}
        </Accordion>
      ) : (
        <div className="flex flex-col gap-5 rounded-2xl border bg-muted/20 px-6 py-8 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">
              Live fares are refreshing
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a search to see the latest schedules and prices.
            </p>
          </div>
          <Button
            nativeButton={false}
            render={<Link href={fallbackHref} prefetch={false} />}
            className="h-11 w-full rounded-xl px-7 text-sm sm:w-auto"
          >
            Search flights
          </Button>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Fares are live estimates for 1 adult in economy and may change before
        booking.
      </p>
    </section>
  )
}

export function PopularFlightsSkeleton() {
  return (
    <section
      aria-label="Loading popular flights"
      aria-busy="true"
      className="w-full mx-auto max-w-screen-2xl px-4 py-16 md:px-8 lg:px-12"
    >
      <div className="h-9 w-3/4 max-w-xl rounded-lg bg-muted motion-safe:animate-pulse" />
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[0, 1, 2, 3].map((key) => (
          <div
            key={key}
            className="h-52 rounded-2xl bg-muted motion-safe:animate-pulse"
          />
        ))}
      </div>
    </section>
  )
}
