import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ComponentProps } from "react"
import { applicationFixture } from "../testing/application-fixture"

vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}))
vi.mock("./pricing-estimate", () => ({
  VisaApplicationPricingEstimate: () => <span>Saved estimate</span>,
}))
import { VisaApplicationShell } from "./application-shell"

afterEach(cleanup)
describe("visa application progress", () => {
  it("does not expose future steps as keyboard-focusable links", () => {
    render(
      <VisaApplicationShell detail={applicationFixture()} currentStep="trip">
        Trip form
      </VisaApplicationShell>
    )
    const progress = within(
      screen.getByRole("navigation", {
        name: "Visa request progress",
      })
    )
    expect(progress.getAllByRole("link")).toHaveLength(1)
    expect(
      progress.getByRole("link", { name: /Trip/ }).getAttribute("aria-current")
    ).toBe("step")
    expect(progress.queryByRole("link", { name: /Documents/ })).toBeNull()
    expect(progress.getByText("Documents").getAttribute("aria-disabled")).toBe(
      "true"
    )
  })
})
