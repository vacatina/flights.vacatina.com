import { Money } from "@/modules/currency/ui"
import { Separator } from "@/components/ui/separator"
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
      <PriceRow
        label="Government fee"
        value={<Money money={pricing.governmentFee} />}
      />
      <PriceRow
        label="Vacatina processing fee"
        value={<Money money={pricing.processingFee} />}
      />
      <Separator />
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

function PriceRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}
