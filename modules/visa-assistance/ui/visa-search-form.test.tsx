import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import { VisaSearchForm } from "@/modules/visa-assistance/ui/visa-search-form"

afterEach(cleanup)

describe("VisaSearchForm", () => {
  test("uses the flight progress animation for the primary visa search", () => {
    render(<VisaSearchForm />)

    const button = screen.getByRole("button", {
      name: "Search Visa Services",
    })

    expect(button.className).toContain("overflow-hidden")
    expect(button.querySelector('div[style*="width"]')).toBeTruthy()
  })

  test("uses the shared loading action for compact searches too", () => {
    render(<VisaSearchForm compact />)

    const button = screen.getByRole("button", { name: "Search visa services" })

    expect(button.className).toContain("overflow-hidden")
  })
})
