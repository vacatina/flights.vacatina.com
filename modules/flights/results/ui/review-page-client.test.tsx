import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import type { ReactNode } from "react"

import type { ReviewPageData } from "@/modules/flights/results/domain"
import { ReviewPageClient } from "@/modules/flights/results/ui/review-page-client"

const replaceMock = vi.fn()
const pushMock = vi.fn()
let searchParamsValue = "selected=off_partial_1%2Coff_partial_2"
const createCheckoutQuoteActionMock = vi.fn<
  (input: unknown) => Promise<{ ok: true; data: { quoteId: string; expiresAt: string } }>
>(async () => ({
  ok: true as const,
  data: {
    quoteId: "pqt_1",
    expiresAt: "2026-04-11T10:00:00.000Z",
  },
}))

afterEach(() => {
  cleanup()
  replaceMock.mockClear()
  pushMock.mockClear()
  createCheckoutQuoteActionMock.mockClear()
  searchParamsValue = "selected=off_partial_1%2Coff_partial_2"
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: (...args: unknown[]) => {
      replaceMock(...args)
      const href = args[0]

      if (typeof href === "string") {
        const query = href.split("?")[1]
        searchParamsValue = query ?? ""
      }
    },
    push: pushMock,
  }),
  usePathname: () => "/results/prq_1/review",
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}))

vi.mock("@/modules/flights/results/server/actions", () => ({
  createCheckoutQuoteAction: (input: unknown) => createCheckoutQuoteActionMock(input),
}))

vi.mock("@clerk/nextjs", () => ({
  Show: ({ children }: { children: ReactNode }) => children,
}))

test("ReviewPageClient keeps inbound leg locked before outbound selection", () => {
  render(<ReviewPageClient data={createReviewData()} />)

  const message = screen.getByText(
    "Choose a fare option for the previous flight to see the available fares for this flight."
  )

  expect(message).toBeTruthy()
})

test("ReviewPageClient updates URL when selecting a fare", () => {
  render(<ReviewPageClient data={createReviewData()} />)

  const fareButton = screen.getByRole("button", {
    name: /Economy Convenience/i,
  })
  fireEvent.click(fareButton)

  expect(replaceMock).toHaveBeenCalledTimes(1)
  const navigationUrl = replaceMock.mock.calls[0]?.[0] as string
  const search = navigationUrl.split("?")[1]

  expect(search).toBeTruthy()
  const params = new URLSearchParams(search)
  expect(params.get("selected")).toBe("off_partial_1,off_partial_2")
  expect(params.getAll("fare")).toEqual(["fare_out_eco"])
  expect(params.get("focusLeg")).toBe("1")
})

test("ReviewPageClient navigates to checkout when summary is complete", async () => {
  render(
    <ReviewPageClient
      data={createReviewData({
        state: {
          selected: ["off_partial_1", "off_partial_2"],
          fare: ["fare_out_eco", "fare_in_classic"],
        },
        summary: {
          soldByLabel: "Sold by Qatar Airways",
          conditions: ["No data on changes"],
          co2Label: "From 581kg CO2",
          totalAmountLabel: "US$915.60",
          checkoutEnabled: true,
          helperText: "Selected fare options for all flights",
          finalOfferId: "off_1",
        },
      })}
    />
  )

  const checkoutButton = screen.getByRole("button", { name: "Go to checkout" })
  fireEvent.click(checkoutButton)

  await waitFor(() =>
    expect(pushMock).toHaveBeenCalledWith(
      "/results/prq_1/checkout?offer=off_1&selected=off_partial_1%2Coff_partial_2&quote=pqt_1"
    )
  )

  expect(createCheckoutQuoteActionMock).toHaveBeenCalledWith({
    partialOfferRequestId: "prq_1",
    selected: ["off_partial_1", "off_partial_2"],
    offerId: "off_1",
  })
})

test("ReviewPageClient blocks checkout when search session is expired", () => {
  render(
    <ReviewPageClient
      data={createReviewData({
        offerExpiresAtIso: "2000-04-04T10:00:00.000Z",
        offerExpiresAtLabel: "04/04/2000, 10:00",
        state: {
          selected: ["off_partial_1", "off_partial_2"],
          fare: ["fare_out_eco", "fare_in_classic"],
        },
        summary: {
          soldByLabel: "Sold by Qatar Airways",
          conditions: ["No data on changes"],
          co2Label: "From 581kg CO2",
          totalAmountLabel: "US$915.60",
          checkoutEnabled: true,
          helperText: "Selected fare options for all flights",
          finalOfferId: "off_1",
        },
      })}
    />
  )

  expect(screen.getByText("Session expired")).toBeTruthy()
  expect(screen.getByRole("button", { name: /Go to checkout/ }).hasAttribute("disabled")).toBe(
    true
  )
})

test("ReviewPageClient auto-scrolls to next leg after fare selection", async () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
  const scrollIntoViewMock = vi.fn()

  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoViewMock,
  })

  const { rerender } = render(<ReviewPageClient data={createReviewData()} />)

  fireEvent.click(
    screen.getByRole("button", {
      name: /Economy Convenience/i,
    })
  )

  const inboundUnlockedData = createReviewData({
    state: {
      selected: ["off_partial_1", "off_partial_2"],
      fare: ["fare_out_eco"],
    },
    legs: [
      {
        ...createReviewData().legs[0],
      },
      {
        ...createReviewData().legs[1],
        isLocked: false,
        lockMessage: undefined,
        options: [
          {
            key: "fare_in_classic",
            legIndex: 1,
            cabinLabel: "ECONOMY",
            fareLabel: "Economy Classic",
            lines: [
              {
                id: "changes",
                label: "No data on changes",
                kind: "change",
              },
            ],
            priceFromLabel: "US$943.60",
            priceFromValue: 943.6,
            currency: "USD",
            isSelected: false,
            isSelectable: true,
          },
        ],
      },
    ],
  })

  rerender(<ReviewPageClient data={inboundUnlockedData} />)

  await waitFor(() => {
    expect(scrollIntoViewMock).toHaveBeenCalled()
  })

  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: originalScrollIntoView,
  })
})

function createReviewData(overrides?: Partial<ReviewPageData>): ReviewPageData {
  return {
    partialOfferRequestId: "prq_1",
    breadcrumbs: ["CMB to DXB", "DXB to CMB"],
    totalLegs: 2,
    offerExpiresAtIso: "2099-04-04T10:00:00.000Z",
    offerExpiresAtLabel: "04/04/2099, 10:00",
    state: {
      selected: ["off_partial_1", "off_partial_2"],
      fare: [],
    },
    legs: [
      {
        legIndex: 0,
        title: "Outbound",
        dateLabel: "4 Apr 2026",
        isLocked: false,
        header: {
          legIndex: 0,
          title: "Outbound",
          dateLabel: "4 Apr 2026",
          ownerName: "Qatar Airways",
          ownerLogoSymbolUrl: null,
          departureTimeLabel: "20:20",
          arrivalTimeLabel: "03:25",
          arrivalDayOffset: 1,
          durationLabel: "08h 35m",
          routeLabel: "CMB - DXB",
          stopsLabel: "1 stop",
          stopsDetails: "1 stop DOH",
        },
        options: [
          {
            key: "fare_out_eco",
            legIndex: 0,
            cabinLabel: "ECONOMY",
            fareLabel: "Economy Convenience",
            lines: [
              {
                id: "changes",
                label: "No data on changes",
                kind: "change",
              },
            ],
            priceFromLabel: "US$915.60",
            priceFromValue: 915.6,
            currency: "USD",
            isSelected: false,
            isSelectable: true,
          },
        ],
      },
      {
        legIndex: 1,
        title: "Inbound",
        dateLabel: "22 Apr 2026",
        isLocked: true,
        lockMessage:
          "Choose a fare option for the previous flight to see the available fares for this flight.",
        header: {
          legIndex: 1,
          title: "Inbound",
          dateLabel: "22 Apr 2026",
          ownerName: "Qatar Airways",
          ownerLogoSymbolUrl: null,
          departureTimeLabel: "23:25",
          arrivalTimeLabel: "17:45",
          arrivalDayOffset: 1,
          durationLabel: "16h 50m",
          routeLabel: "DXB - CMB",
          stopsLabel: "1 stop",
          stopsDetails: "1 stop DOH",
        },
        options: [],
      },
    ],
    summary: {
      soldByLabel: "Sold by Qatar Airways",
      conditions: ["No data on changes", "No data on refunds"],
      co2Label: "From 581kg CO2",
      totalAmountLabel: "US$915.60",
      checkoutEnabled: false,
      helperText: "Select fare options for all flights",
      finalOfferId: null,
    },
    ...overrides,
  }
}
