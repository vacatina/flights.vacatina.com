import { expect, test } from "vitest"

import {
  bookingListInputSchema,
  parseBookingListQuery,
} from "@/modules/flights/orders/domain"

test("bookingListInputSchema parses full list query", () => {
  const parsed = bookingListInputSchema.parse({
    page: "2",
    pageSize: "20",
    q: "bk-f60f",
    status: "confirmed",
    sort: "amount_high",
  })

  expect(parsed).toEqual({
    page: 2,
    pageSize: 20,
    q: "bk-f60f",
    status: "confirmed",
    sort: "amount_high",
  })
})

test("parseBookingListQuery falls back invalid fields and preserves valid ones", () => {
  const parsed = parseBookingListQuery({
    page: "3",
    pageSize: "invalid",
    q: "  BK-F60F36ABAD  ",
    status: "broken",
    sort: "oldest",
  })

  expect(parsed).toEqual({
    page: 3,
    pageSize: 10,
    q: "BK-F60F36ABAD",
    status: "all",
    sort: "oldest",
  })
})

test("parseBookingListQuery returns defaults for empty input", () => {
  const parsed = parseBookingListQuery({})

  expect(parsed).toEqual({
    page: 1,
    pageSize: 10,
    q: undefined,
    status: "all",
    sort: "newest",
  })
})
