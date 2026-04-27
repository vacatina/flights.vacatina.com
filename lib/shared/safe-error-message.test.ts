import { describe, expect, test } from "vitest"

import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"

describe("toSafeUserErrorMessage", () => {
  test("returns fallback when message looks like backend query output", () => {
    const message =
      'Failed query: insert into "priced_quotes" values ($1, $2) params: abc'

    expect(
      toSafeUserErrorMessage(message, "Something went wrong. Please try again.")
    ).toBe("Something went wrong. Please try again.")
  })

  test("returns normalized message when safe", () => {
    expect(
      toSafeUserErrorMessage("  Payment window was dismissed.  ", "fallback")
    ).toBe("Payment window was dismissed.")
  })
})
