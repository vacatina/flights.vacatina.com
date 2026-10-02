"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { holidayCategories } from "../data/categories"
import type { HolidayFilters as Filters } from "../domain/catalog"

type Option = { value: string; label: string }

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value}
        onValueChange={(next) => onChange(next ?? "all")}
        items={options}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

export function HolidayFilters({
  filters,
  onChange,
}: {
  filters: Filters
  onChange: (next: Filters) => void
}) {
  const active = Object.values(filters).some((value) => value !== "all")
  return (
    <div className="flex flex-col gap-4">
      <FieldGroup className="grid gap-4 sm:grid-cols-3">
        <FilterSelect
          id="holiday-category"
          label="Your kind of holiday"
          value={filters.category}
          options={[
            { value: "all", label: "All experiences" },
            ...holidayCategories.map((item) => ({
              value: item.slug,
              label: item.name,
            })),
          ]}
          onChange={(category) => onChange({ ...filters, category })}
        />
        <FilterSelect
          id="holiday-duration"
          label="Time to explore"
          value={filters.duration}
          options={[
            { value: "all", label: "Any duration" },
            { value: "short", label: "3–5 days" },
            { value: "week", label: "6–10 days" },
            { value: "long", label: "11+ days" },
          ]}
          onChange={(duration) => onChange({ ...filters, duration })}
        />
        <FilterSelect
          id="holiday-activity"
          label="Your travel pace"
          value={filters.activity}
          options={[
            { value: "all", label: "Any activity level" },
            { value: "easy", label: "Easy" },
            { value: "moderate", label: "Moderate" },
            { value: "active", label: "Active" },
          ]}
          onChange={(activity) => onChange({ ...filters, activity })}
        />
      </FieldGroup>
      <div className="flex min-h-8 items-center justify-between gap-4">
        {active && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({ category: "all", duration: "all", activity: "all" })
            }
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
