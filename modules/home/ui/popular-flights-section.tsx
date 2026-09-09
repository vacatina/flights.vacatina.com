import Link from "next/link"
import { ArrowRightIcon, PlaneTakeoffIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Money } from "@/modules/currency/ui/money"
import {
  destinations,
  destinationSearchHref,
} from "@/modules/home/domain/destinations"
import { getPopularFlightOffers } from "@/modules/home/server/popular-flights"
import { FlightResultSummary } from "@/modules/flights/results/ui/flight-result-summary"

export async function PopularFlightsSection() {
  const selection = await getPopularFlightOffers()
  const fallbackHref = destinationSearchHref(destinations[0])

  return (
    <section
      aria-labelledby="popular-flights-title"
      className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20 lg:px-12"
    >
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#13357b] dark:text-blue-300">
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
          className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-[#13357b] underline-offset-4 hover:underline dark:text-blue-300"
        >
          Search more flights
          <ArrowRightIcon
            aria-hidden="true"
            className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
          />
        </Link>
      </div>

      {selection ? (
        <div className="-mx-4 grid snap-x snap-mandatory  grid-col-1 gap-5 overflow-x-auto px-4 pb-5  lg:mx-0  lg:px-0 ">
          {selection.offers.map((offer) => (
            <article
              key={offer.id}
              className="min-w-0 snap-start overflow-hidden rounded-2xl border bg-card  transition-[border-color,box-shadow] duration-200 hover:border-[#13357b]/25 "
            >
              <div className="px-5 py-6 md:px-8 md:py-7">
                <FlightResultSummary
                  carrierName={offer.ownerName}
                  carrierCode={offer.ownerCode}
                  carrierLogoUrl={offer.ownerLogoSymbolUrl}
                  flightNumbersLabel={offer.flightNumbersLabel}
                  departureTimeLabel={offer.departureTimeLabel}
                  arrivalTimeLabel={offer.arrivalTimeLabel}
                  arrivalDayOffset={offer.arrivalDayOffset}
                  durationLabel={offer.durationLabel}
                  routeLabel={offer.routeLabel}
                  stopsLabel={offer.stopsLabel}
                  stopsDetails={offer.stopsDetails}
                />
              </div>
              <div className="flex flex-col gap-5 border-t bg-muted/15 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
                <p className="text-sm text-muted-foreground">
                  From{" "}
                  <span className="text-2xl font-semibold tracking-[-0.03em] text-foreground md:text-3xl">
                    <Money
                      money={offer.totalMoney}
                      fallbackLabel={offer.totalAmountLabel}
                    />
                  </span>
                </p>
                <Button
                  nativeButton={false}
                  render={
                    <Link
                      href={`/results/${selection.partialOfferRequestId}/review?selected=${encodeURIComponent(offer.id)}`}
                      prefetch={false}
                      aria-label={`View ${offer.ownerName} flight from ${offer.routeLabel}`}
                    />
                  }
                  className="h-11 w-full rounded-xl px-7 text-sm sm:w-auto"
                >
                  View flight
                </Button>
              </div>
            </article>
          ))}
        </div>
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
      className="mx-auto max-w-7xl px-4 py-16 md:px-8 lg:px-12"
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
