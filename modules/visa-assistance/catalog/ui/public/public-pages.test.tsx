import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ComponentProps } from "react"
import { getVisaCountry } from "@/modules/visa-assistance/domain/countries"
import type { SerializedMoney } from "@/modules/currency/domain/types"
import { listingFixture } from "../../testing/listing-fixture"
import { toPublicVisaListing } from "../../domain/public-listing"

vi.mock(
  "@/modules/visa-assistance/applications/server/actions/create-draft",
  () => ({ createVisaApplicationDraftAction: vi.fn() })
)
vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
  useLinkStatus: () => ({ pending: false }),
}))
vi.mock("@/modules/visa-assistance/ui/visa-search-form", () => ({
  VisaSearchForm: () => <div>Search form</div>,
}))
vi.mock("@/modules/currency/ui/money", () => ({
  Money: ({ money }: { money: SerializedMoney }) => (
    <span>
      {money.currency} {money.amount}
    </span>
  ),
}))
vi.mock("@/modules/currency/ui/fx-estimate-disclosure", () => ({
  FxEstimateDisclosure: () => null,
}))

import { PublicVisaResults } from "./results"
import { PublicVisaDetails } from "./details"
import { PublicVisaLoading } from "./loading"

afterEach(cleanup)

describe("public visa catalog UI", () => {
  it("renders separate visa types with stable listing links and source totals", () => {
    const listings = [
      toPublicVisaListing(listingFixture()),
      toPublicVisaListing(
        listingFixture({ id: "business-id", title: "Business visa" })
      ),
    ]
    render(
      <PublicVisaResults
        passport={getVisaCountry("LK")!}
        destination={getVisaCountry("IN")!}
        listings={listings}
      />
    )
    expect(
      screen.getByRole("heading", { name: "India tourist visa" })
    ).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Business visa" })).toBeTruthy()
    expect(screen.getAllByText("USD 3735")).toHaveLength(2)
    expect(
      screen
        .getAllByRole("link", { name: "View visa details" })
        .map((link) => link.getAttribute("href"))
    ).toEqual(listings.map((listing) => `/visa-assistance/LK/IN/${listing.id}`))
  })
  it("shows a service miss without implying visa-free travel", () => {
    render(
      <PublicVisaResults
        passport={getVisaCountry("LK")!}
        destination={getVisaCountry("IN")!}
        listings={[]}
      />
    )
    expect(
      screen.getByText("Visa assistance not offered for this route")
    ).toBeTruthy()
    expect(
      screen.getByText(/This does not mean a visa is unnecessary/)
    ).toBeTruthy()
    expect(screen.queryByRole("link", { name: "View visa details" })).toBeNull()
  })
  it("renders authored copy, direct fees and configured document scopes with manual checkout", () => {
    render(
      <PublicVisaDetails
        listing={{
          ...toPublicVisaListing(listingFixture()),
          documents: [
            {
              id: "passport",
              label: "Passport scan",
              instructions: "All corners visible.",
              required: true,
              scope: "per_traveler",
            },
            {
              id: "itinerary",
              label: "Travel itinerary",
              instructions: null,
              required: false,
              scope: "per_application",
            },
          ],
        }}
      />
    )
    expect(screen.getByText("Holiday travel only.")).toBeTruthy()
    expect(screen.getByText("All corners visible.")).toBeTruthy()
    expect(screen.getByText("Required")).toBeTruthy()
    expect(screen.getByText("Optional")).toBeTruthy()
    expect(screen.getByText("For each traveler")).toBeTruthy()
    expect(
      screen.getByText("Once per request, shared by all travelers")
    ).toBeTruthy()
    expect(screen.queryByText("Government fee")).toBeNull()
    expect(screen.queryByText("Processing fee")).toBeNull()
    expect(screen.getByText("USD 3735")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: /Start visa request/ })
    ).toBeTruthy()
  })
  it("exposes an accessible loading state", () => {
    render(<PublicVisaLoading />)
    expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("true")
    expect(screen.getByRole("status").textContent).toContain(
      "Loading visa services"
    )
  })
})
