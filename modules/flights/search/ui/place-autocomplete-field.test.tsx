import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useForm } from "react-hook-form"
import { afterEach, expect, test, vi } from "vitest"

import {
  createDefaultFlightSearchValues,
  type FlightSearchFormValues,
  type PlaceSuggestionOption,
} from "@/modules/flights/search/domain"
import { PlaceAutocompleteField } from "@/modules/flights/search/ui/place-autocomplete-field"

vi.mock("@/modules/flights/search/server/actions", () => ({
  searchPlacesAction: vi.fn(async () => ({
    ok: true as const,
    data: [],
  })),
}))

afterEach(() => {
  cleanup()
})

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {
      return undefined
    }

    unobserve() {
      return undefined
    }

    disconnect() {
      return undefined
    }
  }
}

const colomboAirport: PlaceSuggestionOption = {
  id: "arp_cmb_lk",
  type: "airport",
  iataCode: "CMB",
  iataCityCode: "CMB",
  name: "Bandaranaike International",
  cityName: "Colombo",
  countryCode: "LK",
  countryName: "Sri Lanka",
  displayName: "Colombo - Bandaranaike International (CMB)",
}

function TestHarness({
  initialOrigin = null,
}: {
  initialOrigin?: PlaceSuggestionOption | null
}) {
  const defaultValues = createDefaultFlightSearchValues()

  const form = useForm<FlightSearchFormValues>({
    defaultValues: {
      ...defaultValues,
      slices: [
        {
          ...defaultValues.slices[0],
          origin: initialOrigin,
        },
      ],
    },
  })

  return (
    <div>
      <PlaceAutocompleteField
        control={form.control}
        name="slices.0.origin"
        label="Origin"
        placeholder="Origin"
      />
      <button
        type="button"
        onClick={() => form.setValue("slices.0.origin", colomboAirport)}
      >
        Set origin
      </button>
    </div>
  )
}

test("PlaceAutocompleteField syncs input when form value updates externally", async () => {
  render(<TestHarness />)

  const input = screen.getByPlaceholderText("Origin") as HTMLInputElement
  expect(input.value).toBe("")

  fireEvent.click(screen.getByRole("button", { name: "Set origin" }))

  await waitFor(() => {
    expect(input.value).toBe(colomboAirport.displayName)
  })
})

test("PlaceAutocompleteField preserves typed query while editing a selected value", () => {
  render(<TestHarness initialOrigin={colomboAirport} />)

  const input = screen.getByPlaceholderText("Origin") as HTMLInputElement
  expect(input.value).toBe(colomboAirport.displayName)

  fireEvent.change(input, { target: { value: "C" } })

  expect(input.value).toBe("C")
})
