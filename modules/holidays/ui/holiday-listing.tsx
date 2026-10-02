"use client"

import { useState } from "react"
import { Compass, SlidersHorizontal } from "lucide-react"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { holidayPackages } from "../data"
import {
  filterHolidays,
  type HolidayFilters as Filters,
} from "../domain/catalog"
import { HolidayReveal } from "./holiday-reveal"
import { HolidayCard } from "./holiday-card"
import { HolidayDiscovery } from "./holiday-discovery"
import { HolidayFeatured } from "./holiday-featured"
import { HolidayFilters } from "./holiday-filters"

const defaultFilters: Filters = {
  category: "all",
  duration: "all",
  activity: "all",
}

export function HolidayListing() {
  const [filters, setFilters] = useState(defaultFilters)
  const [showFilters, setShowFilters] = useState(false)
  const packages = filterHolidays(holidayPackages, filters)
  return (
    <section
      aria-label="Explore holiday packages"
      className="relative mx-auto flex w-full max-w-screen-2xl flex-col gap-10 px-5 pt-10 pb-12 sm:px-8 md:pb-20"
    >
      <div id="holiday-experiences" className="scroll-mt-28">
        <HolidayDiscovery
          selected={filters.category}
          onSelect={(category) => setFilters({ ...filters, category })}
        />
      </div>
      {filters.category === "all" &&
        filters.duration === "all" &&
        filters.activity === "all" && (
          <HolidayReveal>
            <HolidayFeatured />
          </HolidayReveal>
        )}
      <div
        id="all-holidays"
        className="flex scroll-mt-28 flex-wrap items-end justify-between gap-4 border-t border-border pt-10"
      >
        <div>
          <h2 className="mb-2 font-heading text-3xl tracking-tight sm:text-4xl">
            Explore holiday packages
          </h2>
          <p className="text-sm text-muted-foreground" role="status">
            {packages.length} holidays to discover
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={showFilters}
          aria-controls="holiday-filter-panel"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal data-icon="inline-start" />
          Filter holidays
        </Button>
      </div>
      {showFilters && (
        <div id="holiday-filter-panel">
          <HolidayFilters filters={filters} onChange={setFilters} />
        </div>
      )}
      {packages.length ? (
        <div
          key={`${filters.category}-${filters.duration}-${filters.activity}`}
          className="grid gap-x-7 gap-y-12 duration-500 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          {packages.map((holiday) => (
            <HolidayReveal key={holiday.id} className="h-full">
              <HolidayCard holiday={holiday} />
            </HolidayReveal>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Compass />
            </EmptyMedia>
            <EmptyTitle>A different path awaits</EmptyTitle>
            <EmptyDescription>
              Try another duration or travel pace to find your holiday.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setFilters(defaultFilters)}>
              Explore all holidays
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </section>
  )
}
