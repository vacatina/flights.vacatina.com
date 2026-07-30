import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

const persistDisplayCurrencyMock = vi.hoisted(() => vi.fn())

vi.mock("@/modules/currency/server/actions", () => ({
  persistDisplayCurrency: persistDisplayCurrencyMock,
}))

import type { DisplayCurrencyCode, SerializedFxSnapshot } from "@/modules/currency/domain"
import {
  CurrencyProvider,
  CurrencySelector,
  Money,
  useCurrency,
} from "@/modules/currency/ui"

const fxSnapshot: SerializedFxSnapshot = {
  baseCurrency: "USD",
  rates: {
    USD: { amount: "1000000000000", scale: 12 },
    LKR: { amount: "300000000000000", scale: 12 },
    JPY: { amount: "150000000000000", scale: 12 },
  },
  providerUpdatedAt: "2026-07-30T00:00:00.000Z",
  fetchedAt: "2026-07-30T00:00:00.000Z",
  stale: false,
}

afterEach(() => {
  cleanup()
  persistDisplayCurrencyMock.mockReset()
})

describe("CurrencyProvider", () => {
  test("updates every mounted price immediately and persists the preference", async () => {
    persistDisplayCurrencyMock.mockResolvedValue(undefined)

    render(
      <CurrencyProvider initialCurrency="USD" initialFxSnapshot={fxSnapshot}>
        <CurrencyTestControls />
        <Money money={{ amount: "500", currency: "USD", scale: 2 }} />
        <Money money={{ amount: "500", currency: "USD", scale: 2 }} />
      </CurrencyProvider>
    )

    expect(screen.getAllByText("$5.00")).toHaveLength(2)

    fireEvent.click(screen.getByRole("button", { name: "Use JPY" }))

    expect(screen.getAllByText("¥750")).toHaveLength(2)
    expect(screen.getByTestId("selected-currency").textContent).toBe("JPY")
    await waitFor(() =>
      expect(persistDisplayCurrencyMock).toHaveBeenCalledWith("JPY")
    )
  })

  test("keeps the optimistic selection when cookie persistence fails", async () => {
    persistDisplayCurrencyMock.mockRejectedValue(new Error("cookie unavailable"))

    render(
      <CurrencyProvider initialCurrency="USD" initialFxSnapshot={fxSnapshot}>
        <CurrencyTestControls />
      </CurrencyProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Use LKR" }))

    expect(screen.getByTestId("selected-currency").textContent).toBe("LKR")
    await waitFor(() =>
      expect(persistDisplayCurrencyMock).toHaveBeenCalledWith("LKR")
    )
  })

  test("synchronizes navbar and footer selector state", async () => {
    persistDisplayCurrencyMock.mockResolvedValue(undefined)

    render(
      <CurrencyProvider initialCurrency="USD" initialFxSnapshot={fxSnapshot}>
        <CurrencySelector />
        <CurrencySelector variant="footer" />
      </CurrencyProvider>
    )

    const selectors = screen.getAllByRole("button", {
      name: "Display currency: USD",
    })
    expect(selectors).toHaveLength(2)

    fireEvent.click(selectors[0])
    fireEvent.click(
      await screen.findByRole("menuitemradio", {
        name: /JPY.*Japanese Yen/,
      })
    )

    expect(
      screen.getAllByRole("button", { name: "Display currency: JPY" })
    ).toHaveLength(2)
  })
})

function CurrencyTestControls() {
  const { selectedCurrency, setCurrency } = useCurrency()

  return (
    <>
      <output data-testid="selected-currency">{selectedCurrency}</output>
      {(["LKR", "JPY"] satisfies DisplayCurrencyCode[]).map((currency) => (
        <button
          key={currency}
          type="button"
          onClick={() => setCurrency(currency)}
        >
          Use {currency}
        </button>
      ))}
    </>
  )
}
