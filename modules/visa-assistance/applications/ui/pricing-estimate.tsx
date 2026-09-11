import { Money } from "@/modules/currency/ui"
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
    <dl className="space-y-3 text-sm">
      {processing ? (
        <PriceRow
          label="Vacatina processing fee"
          value={<Money money={processing} />}
        />
      ) : null}
      {government ? (
        <PriceRow label="Government fee" value={<Money money={government} />} />
      ) : null}
      <div className="flex items-center justify-between gap-4 border-t pt-3 font-semibold">
        <dt>Estimated total</dt>
        <dd>
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
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
