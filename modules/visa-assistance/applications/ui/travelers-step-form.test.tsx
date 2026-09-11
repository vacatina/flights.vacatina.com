import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/modules/visa-assistance/applications/server/actions", () => ({
  saveVisaTravelersStepAction: vi.fn(),
}))

import { TravelersStepForm } from "@/modules/visa-assistance/applications/ui/travelers-step-form"

afterEach(cleanup)

describe("TravelersStepForm", () => {
  test("renders multiple new travelers with stable unique keys", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    render(
      <TravelersStepForm
        applicationId="va_123"
        travelerCount={2}
        nationalityCode="LK"
        travelers={[]}
      />
    )

    expect(screen.getByText("Traveler 1")).toBeTruthy()
    expect(screen.getByText("Traveler 2")).toBeTruthy()
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("same key")

    consoleError.mockRestore()
  })
})
