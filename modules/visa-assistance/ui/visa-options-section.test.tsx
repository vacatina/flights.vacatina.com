import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("@/modules/currency/server/actions", () => ({
  persistDisplayCurrency: vi.fn().mockResolvedValue(undefined),
}))

import type {
  DisplayCurrencyCode,
  SerializedFxSnapshot,
} from "@/modules/currency/domain"
import { CurrencyProvider, useCurrency } from "@/modules/currency/ui"
import { VisaOptionsSection } from "@/modules/visa-assistance/ui/visa-options-section"

const fxSnapshot: SerializedFxSnapshot = {
  baseCurrency: "USD",
  rates: {
    USD: { amount: "1000000000000", scale: 12 },
    JPY: { amount: "150000000000000", scale: 12 },
  },
  providerUpdatedAt: "2026-09-10T00:00:00.000Z",
  fetchedAt: "2026-09-10T00:00:00.000Z",
  stale: false,
}

afterEach(cleanup)

describe("VisaOptionsSection currency display", () => {
  test("updates visa fees when the global display currency changes", () => {
    render(
      <CurrencyProvider initialCurrency="USD" initialFxSnapshot={fxSnapshot}>
        <CurrencyControl />
        <VisaOptionsSection
          documents={[
            {
              document: {
                visa_type_id: 42,
                name: "Tourist eVisa",
                classification: "evisa",
                is_required: true,
              },
              product: {
                id: 42,
                product_id: 10139,
                validity: {
                  base_price: {
                    price: "70.990",
                    currency: "USD",
                  },
                  gov_fee: "110",
                },
                pricing: {
                  visa_cost: "110.00",
                  visa_cost_pretty: "$110.00",
                  name: "Government Fee",
                },
              },
              pricing: {
                processingFee: {
                  feeComponent: "processing_fee",
                  sourceMoney: { amount: "7099", currency: "USD", scale: 2 },
                  markupMoney: { amount: "710", currency: "USD", scale: 2 },
                  sellMoney: { amount: "7809", currency: "USD", scale: 2 },
                  appliedRuleId: "rule_10_percent",
                  appliedRuleName: "Processing default",
                  appliedRuleSpecificity: 0,
                },
                governmentFee: {
                  feeComponent: "government_fee",
                  sourceMoney: { amount: "11000", currency: "USD", scale: 2 },
                  markupMoney: { amount: "500", currency: "USD", scale: 2 },
                  sellMoney: { amount: "11500", currency: "USD", scale: 2 },
                  appliedRuleId: "rule_government_markup",
                  appliedRuleName: "Government fee markup",
                  appliedRuleSpecificity: 0,
                },
                totalSellMoney: {
                  amount: "19309",
                  currency: "USD",
                  scale: 2,
                },
              },
            },
          ]}
          outcome="visa_supported"
        />
      </CurrencyProvider>
    )

    expect(screen.getByText("$83.09")).toBeTruthy()
    expect(screen.getByText("$110.00")).toBeTruthy()
    expect(screen.getByText("$193.09")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Use JPY" }))

    expect(screen.getByText("¥12,464")).toBeTruthy()
    expect(screen.getByText("¥16,500")).toBeTruthy()
    expect(screen.getByText("¥28,964")).toBeTruthy()
    expect(screen.getByText(/Estimated exchange rates as of/)).toBeTruthy()
  })

  test("preserves a provider label when no numeric amount is available", () => {
    render(
      <CurrencyProvider initialCurrency="USD" initialFxSnapshot={fxSnapshot}>
        <VisaOptionsSection
          documents={[
            {
              document: { visa_type_id: 42, name: "Tourist eVisa" },
              product: {
                id: 42,
                pricing: {
                  visa_cost_pretty: "Paid at the embassy",
                  name: "Government Fee",
                },
              },
            },
          ]}
          outcome="visa_supported"
        />
      </CurrencyProvider>
    )

    expect(screen.getByText("Paid at the embassy")).toBeTruthy()
  })
})

function CurrencyControl() {
  const { setCurrency } = useCurrency()

  return (
    <button
      type="button"
      onClick={() => setCurrency("JPY" satisfies DisplayCurrencyCode)}
    >
      Use JPY
    </button>
  )
}
