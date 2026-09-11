import { Money } from "@/modules/currency/ui"
import { Separator } from "@/components/ui/separator"
import type { VisaApplicationPricingSnapshot } from "@/modules/visa-assistance/applications/domain"
import { addVisaMoney } from "@/modules/visa-assistance/pricing/domain"

export function VisaApplicationPricingEstimate({
  pricing,
}: {
  pricing: VisaApplicationPricingSnapshot | null
}) {
  if (!pricing) {
    return <p className="text-sm text-muted-foreground">Price unavailable</p>
  }

  const processing = addVisaMoney(
    pricing.processingFee?.sellMoney ?? null,
    pricing.governmentFee?.markupMoney ?? null
  )
  const government = pricing.governmentFee?.sourceMoney ?? null

  return (
    <dl className="flex flex-col gap-3 text-sm">
      {processing ? (
        <PriceRow
          label="Vacatina processing fee"
          value={<Money money={processing} />}
        />
      ) : null}
      {government ? (
        <PriceRow label="Government fee" value={<Money money={government} />} />
      ) : null}
      <Separator />
      <div className="flex items-center justify-between gap-4 text-base font-semibold">
        <dt>Estimated total</dt>
        <dd className="tabular-nums">
          {pricing.totalSellMoney ? (
            <Money money={pricing.totalSellMoney} />
          ) : (
            "Unavailable"
          )}
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
