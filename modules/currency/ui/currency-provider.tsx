"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react"

import {
  CURRENCY_REGISTRY,
  DEFAULT_DISPLAY_CURRENCY,
  formatMoneyForDisplay,
  formatSerializedMoney,
  type DisplayCurrencyCode,
  type FormattedMoney,
  type SerializedFxSnapshot,
  type SerializedMoney,
} from "@/modules/currency/domain"
import { persistDisplayCurrency } from "@/modules/currency/server/actions"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"

interface CurrencyContextValue {
  selectedCurrency: DisplayCurrencyCode
  currencies: typeof CURRENCY_REGISTRY
  fxSnapshot: SerializedFxSnapshot | null
  preferencePending: boolean
  setCurrency: (currency: DisplayCurrencyCode) => void
  formatMoney: (
    money: SerializedMoney,
    fallbackLabel?: string | null
  ) => FormattedMoney
  formatOriginalMoney: (money: SerializedMoney) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

const fallbackContext: CurrencyContextValue = {
  selectedCurrency: DEFAULT_DISPLAY_CURRENCY,
  currencies: CURRENCY_REGISTRY,
  fxSnapshot: null,
  preferencePending: false,
  setCurrency: () => undefined,
  formatMoney: (money, fallbackLabel) => ({
    label: fallbackLabel?.trim() || formatSerializedMoney(money, "en-LK"),
    currency: money.currency,
    converted: false,
    stale: false,
  }),
  formatOriginalMoney: (money) => formatSerializedMoney(money, "en-LK"),
}

export function CurrencyProvider({
  initialCurrency,
  initialFxSnapshot,
  children,
}: {
  initialCurrency: DisplayCurrencyCode
  initialFxSnapshot: SerializedFxSnapshot | null
  children: ReactNode
}) {
  const [selectedCurrency, setSelectedCurrency] =
    useState<DisplayCurrencyCode>(initialCurrency)
  const [preferencePending, startTransition] = useTransition()

  const setCurrency = useCallback((currency: DisplayCurrencyCode) => {
    setSelectedCurrency(currency)
    startTransition(async () => {
      try {
        await persistDisplayCurrency(currency)
      } catch (error) {
        logFlightFlowError(
          "currency.preference",
          "cookie_persistence_failed",
          error,
          { currency }
        )
      }
    })
  }, [])

  const formatMoney = useCallback(
    (money: SerializedMoney, fallbackLabel?: string | null) => {
      const formatted = formatMoneyForDisplay({
        money,
        targetCurrency: selectedCurrency,
        snapshot: initialFxSnapshot,
        locale: "en-LK",
        fallbackLabel,
      })
      const sourceCurrency = money.currency.trim().toUpperCase()

      if (
        sourceCurrency !== selectedCurrency &&
        formatted.converted === false
      ) {
        logFlightFlow("currency.fx", "missing_source_rate", {
          sourceCurrency,
          targetCurrency: selectedCurrency,
          snapshotAvailable: Boolean(initialFxSnapshot),
        })
        logFlightFlow("currency.fx", "source_currency_fallback", {
          sourceCurrency,
          targetCurrency: selectedCurrency,
        })
      }

      return formatted
    },
    [initialFxSnapshot, selectedCurrency]
  )

  const formatOriginalMoney = useCallback(
    (money: SerializedMoney) => formatSerializedMoney(money, "en-LK"),
    []
  )

  const value = useMemo<CurrencyContextValue>(
    () => ({
      selectedCurrency,
      currencies: CURRENCY_REGISTRY,
      fxSnapshot: initialFxSnapshot,
      preferencePending,
      setCurrency,
      formatMoney,
      formatOriginalMoney,
    }),
    [
      formatMoney,
      formatOriginalMoney,
      initialFxSnapshot,
      preferencePending,
      selectedCurrency,
      setCurrency,
    ]
  )

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  return context ?? fallbackContext
}
