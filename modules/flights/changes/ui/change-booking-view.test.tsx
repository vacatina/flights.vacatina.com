import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { ChangeBookingView } from "@/modules/flights/changes/ui/change-booking-view"

function context(sliceId: string | null) {
  return {
    canStart: true,
    cancellationConflict: false,
    latestChange: null,
    booking: {
      reference: "ABC123",
      routeLabel: "CMB → DXB",
      passengers: [{ id: "p_1" }],
      legs: [{ legIndex: 0, sliceId, title: "Outbound", routeLabel: "CMB → DXB", departureLabel: "Fri, 5 Sep 2026" }],
    },
  }
}

describe("change booking workspace", () => {
  test("leads an eligible customer into the replacement-flight flow", () => {
    render(<ChangeBookingView context={context("sli_1")} />)

    expect(screen.getByRole("heading", { name: "What would you like to change?" })).toBeTruthy()
    expect(screen.getByText("Available online")).toBeTruthy()
    expect(screen.getByRole("link", { name: /search replacement flights/i }).getAttribute("href")).toBe(
      "/booking/ABC123/change/flight",
    )
    expect(screen.getByRole("heading", { name: "Need help with something else?" })).toBeTruthy()
  })

  test("routes an ineligible flight change to support", () => {
    render(<ChangeBookingView context={context(null)} />)

    expect(screen.getByText("Support review")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Ask flight support" }).getAttribute("href")).toBe(
      "/booking/ABC123/change/request?type=other",
    )
  })
})
