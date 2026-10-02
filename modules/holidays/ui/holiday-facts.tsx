import type { HolidayPackage } from "../domain/types"
import { holidayPrice } from "../domain/catalog"

export function HolidayFacts({ holiday }: { holiday: HolidayPackage }) {
  const facts = [
    { label: "Trip location", value: "Sri Lanka" },
    {
      label: "Trip duration",
      value: `${holiday.duration.days} days / ${holiday.duration.nights} nights`,
    },
    { label: "Travel pace", value: holiday.activityLevel },
    { label: "Price", value: holidayPrice(holiday.price) },
    { label: "Best for", value: holiday.bestFor.join(", ") },
    {
      label: "Your journey",
      value: holiday.customizable
        ? "Customisable private tour"
        : "Private tour",
    },
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-1.5">
          <dt className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {fact.label}
          </dt>
          <dd className="text-sm leading-relaxed first-letter:uppercase">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
