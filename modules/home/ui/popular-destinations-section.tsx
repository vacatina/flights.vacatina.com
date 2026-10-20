import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon, MapPinnedIcon } from "lucide-react"

import { destinationSearchHref } from "@/modules/home/domain/destinations"
import { getPopularDestinations } from "@/modules/home/server/popular-destinations"

export async function PopularDestinationsSection() {
  const selection = await getPopularDestinations()

  return (
    <section
      aria-labelledby="popular-destinations-title"
      className="w-full mx-auto max-w-screen-2xl px-4 py-16 md:px-8 md:py-20 lg:px-12"
    >
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#1B1464] dark:text-blue-300">
          <MapPinnedIcon aria-hidden="true" className="size-4" />
          Departing from Colombo
        </div>
        <h2
          id="popular-destinations-title"
          className="text-3xl font-semibold tracking-[-0.035em] text-foreground md:text-[38px]"
        >
          {selection.popular
            ? "Popular destinations from Colombo"
            : "Where will you go next?"}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {selection.popular
            ? "Explore the destinations travellers have booked most recently."
            : "Four destinations to inspire your next journey."}
        </p>
      </div>

      <div className="-mx-4 grid snap-x snap-mandatory auto-cols-[82%] grid-flow-col gap-5 overflow-x-auto px-4 pb-4 sm:auto-cols-[46%] lg:mx-0 lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {selection.destinations.map((destination) => (
          <Link
            key={destination.code}
            href={destinationSearchHref(destination)}
            prefetch={false}
            className="group min-w-0 snap-start rounded-2xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#1B1464]"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
              <Image
                src={destination.image}
                alt={destination.alt}
                fill
                sizes="(max-width: 639px) 82vw, (max-width: 1023px) 46vw, 280px"
                className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
              />
            </div>
            <div className="px-1 pt-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[23px] font-semibold tracking-tight">
                  {destination.city}
                </h3>
                <span className="font-mono text-xs text-muted-foreground">
                  CMB → {destination.code}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {destination.description}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm font-medium text-[#1B1464] dark:text-blue-300">
                <span>Find flights</span>
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Choose your dates to see current fares and availability. Destination
        images are illustrative.
      </p>
    </section>
  )
}

export function PopularDestinationsSkeleton() {
  return (
    <section
      aria-label="Loading destination inspiration"
      aria-busy="true"
      className="w-full mx-auto max-w-screen-2xl px-4 py-16 md:px-8 lg:px-12"
    >
      <div className="h-9 w-3/4 rounded-lg bg-muted motion-safe:animate-pulse" />
      <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div
            key={key}
            className="aspect-[4/5] rounded-2xl bg-muted motion-safe:animate-pulse"
          />
        ))}
      </div>
    </section>
  )
}
