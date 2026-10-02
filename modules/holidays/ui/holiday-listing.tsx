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
import { HolidayCard } from "./holiday-card"
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
      className="relative mx-auto flex max-w-[1060px] flex-col gap-7 px-5 pt-20 pb-12 sm:px-8 md:pb-20"
    >
      <div className="absolute inset-x-5 top-6 flex items-center justify-between gap-4 sm:inset-x-8">
        <p className="text-sm text-muted-foreground" role="status">
          {packages.length} holidays to discover
        </p>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((holiday) => (
            <HolidayCard key={holiday.id} holiday={holiday} />
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
