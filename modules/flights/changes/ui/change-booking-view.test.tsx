import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

vi.mock("@/modules/flights/orders/ui", () => ({
  BookingJourneySummary: () => <div>Journey summary</div>,
}))

import { ChangeBookingView } from "@/modules/flights/changes/ui/change-booking-view"

function context(sliceId: string | null) {
  return {
    canStart: true,
    cancellationConflict: false,
    latestChange: null,
    booking: {
      reference: "ABC123",
      routeLabel: "CMB → DXB",
      legs: [{ legIndex: 0, sliceId }],
    },
  }
}

describe("change booking options", () => {
  test("promotes an eligible flight change to the automated path", () => {
    render(<ChangeBookingView context={context("sli_1")} />)

    expect(screen.getByRole("heading", { name: "Available online" })).toBeTruthy()
    expect(screen.getByText("Duffel-supported")).toBeTruthy()
    expect(
      screen
        .getAllByRole("link", { name: "Continue" })
        .some((link) => link.getAttribute("href") === "/booking/ABC123/change/flight"),
    ).toBe(true)
    expect(screen.getByRole("heading", { name: "Need another change?" })).toBeTruthy()
  })

  test("offers manual help when no flight can be automated", () => {
    render(<ChangeBookingView context={context(null)} />)

    expect(screen.getByText("There are no automated flight options")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Request manual help" }).getAttribute("href")).toBe(
      "/booking/ABC123/change/request?type=other",
    )
  })
})
