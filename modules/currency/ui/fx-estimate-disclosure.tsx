"use client"

import { useCurrency } from "@/modules/currency/ui/currency-provider"

export function FxEstimateDisclosure({
  sourceCurrencies,
  className,
}: {
  sourceCurrencies: readonly string[]
  className?: string
}) {
  const { fxSnapshot, selectedCurrency } = useCurrency()

  const conversionActive =
    fxSnapshot &&
    fxSnapshot.rates[selectedCurrency] &&
    sourceCurrencies.some((currency) => {
      const sourceCurrency = currency.trim().toUpperCase()
      return (
        sourceCurrency !== selectedCurrency &&
        Boolean(fxSnapshot.rates[sourceCurrency])
      )
    })

  if (!fxSnapshot || !conversionActive) {
    return null
  }

  const updatedAt = new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(fxSnapshot.providerUpdatedAt))

  return (
    <p className={className ?? "text-xs text-muted-foreground"}>
      Estimated exchange rates as of {updatedAt}
      {fxSnapshot.stale ? " (stale — last known rate)" : ""}. Final charges use the
      currency confirmed at checkout.
    </p>
  )
}
