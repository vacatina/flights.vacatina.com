import { Money } from "@/modules/currency/ui"
import type { VisaApplicationPricingSnapshot } from "../domain"

export function VisaApplicationPricingEstimate({
  pricing,
}: {
  pricing: VisaApplicationPricingSnapshot | null
}) {
  if (!pricing)
    return <p className="text-sm text-muted-foreground">Price unavailable</p>
  return (
    <dl className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <dt>
          Estimated total · {pricing.travelerCount}{" "}
          {pricing.travelerCount === 1 ? "traveler" : "travelers"}
        </dt>
        <dd className="font-heading text-2xl font-medium tracking-tight text-primary tabular-nums">
          <Money money={pricing.totalMoney} />
        </dd>
      </div>
    </dl>
  )
}
