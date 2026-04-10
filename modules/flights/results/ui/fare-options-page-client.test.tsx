import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import type { FareOptionsPageData } from "@/modules/flights/results/domain"
import { FareOptionsPageClient } from "@/modules/flights/results/ui/fare-options-page-client"

const replaceMock = vi.fn()
const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock,
  }),
}))

vi.mock("@/modules/flights/results/server/actions", () => ({
  loadMoreFareOptionsAction: vi.fn(async () => ({
    ok: true,
    data: {
      offers: [],
      after: null,
    },
  })),
}))

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  replaceMock.mockClear()
  pushMock.mockClear()
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

test("FareOptionsPageClient debounces flight-number filter URL updates", () => {
  render(<FareOptionsPageClient data={createFareOptionsData()} />)

  const input = screen.getByPlaceholderText("e.g. AI0278")

  fireEvent.change(input, { target: { value: "A" } })
  fireEvent.change(input, { target: { value: "AI" } })

  expect(replaceMock).not.toHaveBeenCalled()

  vi.advanceTimersByTime(299)
  expect(replaceMock).not.toHaveBeenCalled()

  vi.advanceTimersByTime(1)
  expect(replaceMock).toHaveBeenCalledTimes(1)
  expect(replaceMock.mock.calls[0]?.[0]).toContain("flightNumber=AI")
})

test("FareOptionsPageClient coalesces take-off slider URL updates", () => {
  render(<FareOptionsPageClient data={createFareOptionsData()} />)

  const sliderThumbs = screen.getAllByRole("slider")
  const takeoffStartThumb = sliderThumbs[0]

  takeoffStartThumb.focus()
  fireEvent.keyDown(takeoffStartThumb, { key: "ArrowRight" })
  fireEvent.keyDown(takeoffStartThumb, { key: "ArrowRight" })

  expect(replaceMock).not.toHaveBeenCalled()

  vi.advanceTimersByTime(300)
  expect(replaceMock).toHaveBeenCalledTimes(1)
  expect(replaceMock.mock.calls[0]?.[0]).toContain("takeoffFrom=")
})

test("FareOptionsPageClient keeps return flow leg progression navigation", () => {
  render(
    <FareOptionsPageClient
      data={createFareOptionsData({
        totalLegs: 2,
        leg: 0,
      })}
    />
  )

  fireEvent.click(screen.getByRole("button", { name: "Select" }))

  expect(pushMock).toHaveBeenCalledWith(
    "/results/prq_1/fare-options?leg=1&sort=least_expensive&stops=any&takeoffFrom=0&takeoffTo=1439&landingFrom=0&landingTo=1439&selected=off_1"
  )
})

test("FareOptionsPageClient keeps one-way final-leg review navigation", () => {
  render(
    <FareOptionsPageClient
      data={createFareOptionsData({
        totalLegs: 1,
        leg: 0,
      })}
    />
  )

  fireEvent.click(screen.getByRole("button", { name: "Select" }))

  expect(pushMock).toHaveBeenCalledWith("/results/prq_1/review?selected=off_1")
})

function createFareOptionsData(
  overrides?: Partial<FareOptionsPageData>
): FareOptionsPageData {
  return {
    partialOfferRequestId: "prq_1",
    leg: 0,
    totalLegs: 1,
    selected: [],
    breadcrumbs: ["CMB to DXB"],
    searchSummary: {
      title: "One way to DXB",
      routeLabel: "CMB ⇄ DXB",
      dateRangeLabel: "04 Apr · 1 passenger",
      passengersLabel: "1 passenger",
      cabinLabel: "Economy",
    },
    offers: [
      {
        id: "off_1",
        ownerName: "Duffel Airways",
        ownerLogoSymbolUrl: null,
        ownerCode: "ZZ",
        departureTimeLabel: "13:09",
        arrivalTimeLabel: "16:37",
        arrivalDayOffset: 0,
        durationLabel: "04h 58m",
        durationMinutes: 298,
        stopsLabel: "Non-stop",
        stopsDetails: "Direct flight",
        routeLabel: "CMB - DXB",
        flightNumbersLabel: "ZZ8759",
        totalAmountLabel: "USD352.85",
        totalAmountValue: 352.85,
        totalCurrency: "USD",
        takeoffMinutes: 789,
        landingMinutes: 997,
        timeline: [
          {
            id: "dep_1",
            dateTimeLabel: "Sat, 04 Apr 2026, 13:09",
            description: "Depart from CMB",
            segmentDurationLabel: "04h 58m",
            meta: [],
          },
          {
            id: "arr_1",
            dateTimeLabel: "Sat, 04 Apr 2026, 16:37",
            description: "Arrive at DXB",
            meta: ["Economy", "Duffel Airways", "ZZ8759", "1 carry-on bag"],
          },
        ],
        layovers: [],
        filterTokens: {
          airline: "duffel airways zz",
          flightNumbers: "zz8759",
        },
      },
    ],
    airlines: ["Duffel Airways"],
    after: null,
    state: {
      leg: 0,
      selected: [],
      sort: "least_expensive",
      stops: "any",
      takeoffFrom: 0,
      takeoffTo: 1439,
      landingFrom: 0,
      landingTo: 1439,
    },
    ...overrides,
  }
}
