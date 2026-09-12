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
      name: "Check Visa Requirements",
    })

    expect(button.className).toContain("overflow-hidden")
    expect(button.querySelector('div[style*="width"]')).toBeTruthy()
  })

  test("keeps the compact check-again action unchanged", () => {
    render(<VisaSearchForm compact />)

    const button = screen.getByRole("button", { name: "Check again" })

    expect(button.className).not.toContain("overflow-hidden")
  })
})
