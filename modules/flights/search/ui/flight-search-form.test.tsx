import { render, screen } from "@testing-library/react"
import { expect, test, vi } from "vitest"

import { FlightSearchForm } from "@/modules/flights/search/ui/flight-search-form"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

vi.mock("@/modules/flights/search/server/actions", () => ({
  submitFlightSearchAction: vi.fn(async () => ({
    ok: true as const,
    data: {
      partialOfferRequestId: "por_test_1",
    },
  })),
  searchPlacesAction: vi.fn(async () => ({
    ok: true as const,
    data: [],
  })),
}))

test("FlightSearchForm does not render multi-city journey option", () => {
  render(<FlightSearchForm />)

  expect(screen.queryByText("Multi-city")).toBeNull()
})
