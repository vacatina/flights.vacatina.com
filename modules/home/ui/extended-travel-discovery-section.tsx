import Link from "next/link"
import {
  ArrowRightIcon,
  BinocularsIcon,
  CarFrontIcon,
  FerrisWheelIcon,
  LandmarkIcon,
  PalmtreeIcon,
  ShipIcon,
  TrainFrontIcon,
  UmbrellaIcon,
} from "lucide-react"

const activityIdeas = [
  {
    title: "Adventure & outdoor",
    description: "Build active days around your destination, dates and traveller mix.",
    icon: FerrisWheelIcon,
  },
  {
    title: "Family experiences",
    description: "Plan age-appropriate experiences around the whole journey.",
    icon: PalmtreeIcon,
  },
  {
    title: "Culture & heritage",
    description: "Explore landmarks, neighbourhoods and cultural highlights.",
    icon: LandmarkIcon,
  },
  {
    title: "Nature & wildlife",
    description: "Plan nature-led experiences with season and destination in mind.",
    icon: BinocularsIcon,
  },
] as const

const transportIdeas = [
  {
    title: "Airport transfers",
    description: "Configure pickup, drop-off, date, time and traveller count before confirmation.",
    icon: CarFrontIcon,
  },
  {
    title: "Private vehicles",
    description: "Request a vehicle class based on passengers, luggage and route.",
    icon: CarFrontIcon,
  },
  {
    title: "Cruise journeys",
    description: "Explore regions first; live sailings and cabins will appear only from verified suppliers.",
    icon: ShipIcon,
  },
  {
    title: "Scenic rail journeys",
    description: "Rail search will be exposed after a connected schedule and inventory source is verified.",
    icon: TrainFrontIcon,
  },
] as const

export function ExtendedTravelDiscoverySection() {
  return (
    <section className="bg-[#FAFAFA] py-16 md:py-20">
      <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div id="activities" className="scroll-mt-24">
          <p className="text-xs font-bold tracking-[0.16em] text-[#1B1464] uppercase">
            Activities & Sightseeing
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[#111] md:text-[40px]">
            Experiences worth adding to the trip
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#525252]">
            These are discovery categories, not live inventory. Available sessions,
            pricing and supplier details will be shown only after a connected activity
            provider is verified.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {activityIdeas.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-[#E5E5E5] bg-white p-6"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#1B1464]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-heading text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#525252]">{description}</p>
                <AssistedLink subject={title} label="Request assistance" />
              </article>
            ))}
          </div>
        </div>

        <div id="cars-transfers" className="mt-16 scroll-mt-24 md:mt-20">
          <p className="text-xs font-bold tracking-[0.16em] text-[#1B1464] uppercase">
            More Ways To Travel
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[#111] md:text-[40px]">
            Move through the journey your way
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#525252]">
            Vacatina will add live provider search as each vertical is connected.
            Until then, these flows remain assisted planning rather than fake inventory.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {transportIdeas.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-[#E5E5E5] bg-white p-6"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#1B1464]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-heading text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#525252]">{description}</p>
                <AssistedLink subject={title} label="Plan with Vacatina" />
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Link
              href="mailto:info@vacatina.com?subject=Scenic%20rail%20journey"
              className="group flex min-h-40 items-center justify-between rounded-[20px] border border-[#E5E5E5] bg-white p-6 outline-none focus-visible:ring-2 focus-visible:ring-[#1B1464]"
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1B1464]">
                  <TrainFrontIcon className="size-5" aria-hidden="true" />
                  Scenic Rail Journeys
                </div>
                <p className="mt-3 max-w-md text-sm leading-6 text-[#525252]">
                  Explore rail journeys and connect destinations by train.
                </p>
              </div>
              <ArrowRightIcon className="size-5 text-[#1B1464] transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              id="travel-insurance"
              href="mailto:info@vacatina.com?subject=Travel%20insurance"
              className="group flex min-h-40 items-center justify-between rounded-[20px] border border-[#E5E5E5] bg-white p-6 outline-none focus-visible:ring-2 focus-visible:ring-[#1B1464]"
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1B1464]">
                  <UmbrellaIcon className="size-5" aria-hidden="true" />
                  Travel Insurance
                </div>
                <p className="mt-3 max-w-md text-sm leading-6 text-[#525252]">
                  Explore coverage options that may suit your journey. Coverage is not
                  automatically included.
                </p>
              </div>
              <ArrowRightIcon className="size-5 text-[#1B1464] transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function AssistedLink({ subject, label }: { subject: string; label: string }) {
  return (
    <Link
      href={`mailto:info@vacatina.com?subject=${encodeURIComponent(subject)}`}
      className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#1B1464] underline-offset-4 hover:underline"
    >
      {label}
      <ArrowRightIcon className="size-4" aria-hidden="true" />
    </Link>
  )
}
