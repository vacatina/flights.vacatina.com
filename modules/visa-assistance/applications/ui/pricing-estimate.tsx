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
      <div className="flex items-center justify-between gap-4 text-base font-semibold">
        <dt>
          Estimated total · {pricing.travelerCount}{" "}
          {pricing.travelerCount === 1 ? "traveler" : "travelers"}
        </dt>
        <dd className="tabular-nums">
          <Money money={pricing.totalMoney} />
        </dd>
      </div>
    </dl>
  )
}
