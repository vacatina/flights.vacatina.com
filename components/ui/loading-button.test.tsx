import { Activity } from "react"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LoadingButton } from "./loading-button"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("LoadingButton recovery", () => {
  it("finishes the animation and allows repeated searches", () => {
    const { rerender } = render(<LoadingButton isLoading>Search</LoadingButton>)
    const button = screen.getByRole("button", {
      name: "Search",
    }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    rerender(<LoadingButton>Search</LoadingButton>)
    act(() => vi.advanceTimersByTime(499))
    expect(button.disabled).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(button.disabled).toBe(false)
    rerender(<LoadingButton isLoading>Search</LoadingButton>)
    expect(button.disabled).toBe(true)
    rerender(<LoadingButton>Search</LoadingButton>)
    act(() => vi.advanceTimersByTime(500))
    expect(button.disabled).toBe(false)
  })

  it("recovers when a cached page becomes visible again", () => {
    function CachedPage({
      mode,
      loading,
    }: {
      mode: "visible" | "hidden"
      loading: boolean
    }) {
      return (
        <Activity mode={mode}>
          <LoadingButton isLoading={loading}>Search</LoadingButton>
        </Activity>
      )
    }
    const { rerender } = render(<CachedPage mode="visible" loading />)
    rerender(<CachedPage mode="visible" loading={false} />)
    act(() => vi.advanceTimersByTime(100))
    rerender(<CachedPage mode="hidden" loading={false} />)
    act(() => vi.advanceTimersByTime(1000))
    rerender(<CachedPage mode="visible" loading={false} />)
    act(() => vi.advanceTimersByTime(500))
    const button = screen.getByRole("button", {
      name: "Search",
    }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })

  it("resets immediately on error while preserving an explicit disabled state", () => {
    const { rerender } = render(<LoadingButton isLoading>Search</LoadingButton>)
    rerender(<LoadingButton isError>Search</LoadingButton>)
    const button = screen.getByRole("button", {
      name: "Search",
    }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
    rerender(<LoadingButton disabled>Search</LoadingButton>)
    expect(button.disabled).toBe(true)
  })
})
