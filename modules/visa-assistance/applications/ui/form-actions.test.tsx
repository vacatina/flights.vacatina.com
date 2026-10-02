import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ComponentProps } from "react"
vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}))
import { VisaFormActions } from "./form-actions"

afterEach(cleanup)
describe("visa step navigation", () => {
  it("uses real links for available navigation", () => {
    render(
      <VisaFormActions
        backHref="/contact"
        nextHref="/review"
        isPending={false}
      />
    )
    expect(screen.getAllByRole("link")).toHaveLength(2)
    expect(screen.queryByRole("button")).toBeNull()
  })
  it("removes navigation while an upload is pending", () => {
    render(<VisaFormActions backHref="/contact" nextHref="/review" isPending />)
    expect(screen.queryByRole("link")).toBeNull()
    for (const button of screen.getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
    expect(
      screen
        .getByRole("button", { name: "Working..." })
        .getAttribute("aria-busy")
    ).toBe("true")
  })
})
