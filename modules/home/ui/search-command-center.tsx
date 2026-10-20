"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BedDoubleIcon,
  CarFrontIcon,
  FerrisWheelIcon,
  PackageIcon,
  PlaneIcon,
  ShipIcon,
  StampIcon,
  TrainFrontIcon,
  WandSparklesIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { FlightSearchForm } from "@/modules/flights/search/ui"
import type { FlightSearchFormValues } from "@/modules/flights/search/domain"
import { HotelSearchForm } from "@/modules/hotels/search/ui/hotel-search-form"
import { VisaSearchForm } from "@/modules/visa-assistance/ui/visa-search-form"

type SearchTab =
  | "bundle"
  | "flights"
  | "hotels"
  | "visa"
  | "holidays"
  | "cars"
  | "rails"
  | "cruises"
  | "activities"

const tabs = [
  { id: "bundle", label: "Build Your Bundle", icon: WandSparklesIcon },
  { id: "flights", label: "Flights", icon: PlaneIcon },
  { id: "hotels", label: "Hotels", icon: BedDoubleIcon },
  { id: "visa", label: "Visa Assistance", icon: StampIcon },
  { id: "holidays", label: "Holiday Packages", icon: PackageIcon },
  { id: "cars", label: "Cars & Transfers", icon: CarFrontIcon },
  { id: "rails", label: "Rails", icon: TrainFrontIcon },
  { id: "cruises", label: "Cruises", icon: ShipIcon },
  { id: "activities", label: "Activities", icon: FerrisWheelIcon },
] as const

export function SearchCommandCenter({
  initialFlightValues,
}: {
  initialFlightValues?: FlightSearchFormValues
}) {
  const [activeTab, setActiveTab] = useState<SearchTab>("flights")

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length
    else if (event.key === "Home") nextIndex = 0
    else if (event.key === "End") nextIndex = tabs.length - 1
    else return

    event.preventDefault()
    const next = tabs[nextIndex]
    setActiveTab(next.id)
    document.getElementById(`vacatina-search-tab-${next.id}`)?.focus()
  }

  return (
    <section
      id="search-command-center"
      aria-labelledby="search-command-center-title"
      className="relative z-10 mx-auto -mt-14 w-full max-w-[1320px] scroll-mt-24 px-4 sm:px-6 lg:px-8"
    >
      <h2 id="search-command-center-title" className="sr-only">
        Search and plan your trip
      </h2>

      <div className="overflow-hidden rounded-[24px] border border-border bg-white shadow-[0_24px_70px_-34px_rgba(27,20,100,0.35)]">
        <div
          role="tablist"
          aria-label="Travel services"
          className="flex gap-1 overflow-x-auto border-b border-border bg-[#FAFAFA] p-2"
        >
          {tabs.map(({ id, label, icon: Icon }, index) => {
            const selected = activeTab === id
            return (
              <button
                key={id}
                id={`vacatina-search-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`vacatina-search-panel-${id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#1B1464] focus-visible:ring-offset-2",
                  selected
                    ? "bg-[#1B1464] text-white"
                    : "text-[#525252] hover:bg-white hover:text-[#1B1464]"
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div
            id="vacatina-search-panel-flights"
            role="tabpanel"
            aria-labelledby="vacatina-search-tab-flights"
            hidden={activeTab !== "flights"}
          >
            {activeTab === "flights" ? <FlightSearchForm initialValues={initialFlightValues} /> : null}
          </div>

          <div
            id="vacatina-search-panel-hotels"
            role="tabpanel"
            aria-labelledby="vacatina-search-tab-hotels"
            hidden={activeTab !== "hotels"}
          >
            {activeTab === "hotels" ? <HotelSearchForm /> : null}
          </div>

          <div
            id="vacatina-search-panel-visa"
            role="tabpanel"
            aria-labelledby="vacatina-search-tab-visa"
            hidden={activeTab !== "visa"}
          >
            {activeTab === "visa" ? <VisaSearchForm /> : null}
          </div>

          <SimplePanel
            id="bundle"
            activeTab={activeTab}
            title="Build a trip around what matters to you"
            description="Start with your destination and dates, then combine the services you want. Live prices are confirmed by each connected provider before booking."
            cta="Start with flights"
            href="#search-command-center"
            onAction={() => setActiveTab("flights")}
          />
          <SimplePanel
            id="holidays"
            activeTab={activeTab}
            title="Holiday packages you can customise"
            description="Explore curated journeys, then tailor dates, travellers and inclusions before you commit."
            cta="Explore holiday packages"
            href="/holiday-packages"
          />
          <SimplePanel
            id="cars"
            activeTab={activeTab}
            title="Cars & transfers"
            description="This vertical is being connected to Vacatina’s provider layer. No live vehicle inventory is shown on the homepage yet."
            cta="Contact support"
            href="mailto:info@vacatina.com?subject=Cars%20and%20transfers"
          />
          <SimplePanel
            id="rails"
            activeTab={activeTab}
            title="Rail journeys"
            description="Rail search is planned in the shared provider architecture. We will only expose live schedules after a supplier connection is verified."
            cta="Request assistance"
            href="mailto:info@vacatina.com?subject=Rail%20journey"
          />
          <SimplePanel
            id="cruises"
            activeTab={activeTab}
            title="Cruises"
            description="Cruise discovery is planned. Live sailings, cabin inventory and pricing will appear only after an approved cruise supplier is connected."
            cta="Request assistance"
            href="mailto:info@vacatina.com?subject=Cruise%20assistance"
          />
          <SimplePanel
            id="activities"
            activeTab={activeTab}
            title="Activities & experiences"
            description="Activity search is part of the Vacatina roadmap. For now, use our team for destination-specific assistance."
            cta="Ask Vacatina"
            href="mailto:info@vacatina.com?subject=Activities%20and%20experiences"
          />
        </div>
      </div>

      <p className="mt-3 text-center text-xs leading-relaxed text-[#525252]">
        Live prices and availability are refreshed during search and revalidated before booking.
      </p>
    </section>
  )
}

function SimplePanel({
  id,
  activeTab,
  title,
  description,
  cta,
  href,
  onAction,
}: {
  id: SearchTab
  activeTab: SearchTab
  title: string
  description: string
  cta: string
  href: string
  onAction?: () => void
}) {
  return (
    <div
      id={`vacatina-search-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`vacatina-search-tab-${id}`}
      hidden={activeTab !== id}
      className="grid gap-6 rounded-2xl bg-[#FAFAFA] p-6 lg:grid-cols-[1fr_auto] lg:items-center"
    >
      <div>
        <h3 className="font-heading text-2xl font-semibold tracking-tight text-[#1B1464]">
          {title}
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#525252]">
          {description}
        </p>
      </div>
      <Link
        href={href}
        onClick={onAction}
        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#1B1464] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1464]"
      >
        {cta}
      </Link>
    </div>
  )
}
