"use client"

import type { HTMLAttributes } from "react"

import {
  serializeMoney,
  type SerializedMoney,
} from "@/modules/currency/domain"
import { useCurrency } from "@/modules/currency/ui/currency-provider"

export function Money({
  money,
  fallbackLabel,
  ...props
}: {
  money: SerializedMoney
  fallbackLabel?: string | null
} & HTMLAttributes<HTMLSpanElement>) {
  const { formatMoney } = useCurrency()
  const formatted = formatMoney(money, fallbackLabel)

  return (
    <span
      {...props}
      data-display-currency={formatted.currency}
      data-converted={formatted.converted ? "true" : "false"}
    >
      {formatted.label}
    </span>
  )
}

export function DecimalMoney({
  value,
  currency,
  fallbackLabel,
  ...props
}: {
  value: string | number
  currency: string
  fallbackLabel?: string | null
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <Money
      {...props}
      money={serializeMoney(value, currency)}
      fallbackLabel={fallbackLabel}
    />
  )
}

export function OriginalMoney({
  money,
  ...props
}: {
  money: SerializedMoney
} & HTMLAttributes<HTMLSpanElement>) {
  const { formatOriginalMoney } = useCurrency()

  return <span {...props}>{formatOriginalMoney(money)}</span>
}

export function OriginalDecimalMoney({
  value,
  currency,
  ...props
}: {
  value: string | number
  currency: string
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <OriginalMoney
      {...props}
      money={serializeMoney(value, currency)}
    />
  )
}
