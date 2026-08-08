import { expect, test } from "vitest"

import { parseAdminBookingListQuery } from "@/modules/flights/orders/domain/admin-schema"

test("parseAdminBookingListQuery normalizes a valid admin table query", () => {
  expect(
    parseAdminBookingListQuery({
      page: "2",
      pageSize: "50",
      q: "  customer@example.com  ",
      status: "cancelled",
      sort: "amount_high",
    })
  ).toEqual({
    page: 2,
    pageSize: 50,
    q: "customer@example.com",
    status: "cancelled",
    sort: "amount_high",
  })
})

test("parseAdminBookingListQuery preserves valid fields when another field is invalid", () => {
  expect(
    parseAdminBookingListQuery({
      page: "not-a-page",
      q: "BK-123456",
      status: "unknown",
    })
  ).toEqual({
    page: 1,
    pageSize: 20,
    q: "BK-123456",
    status: "all",
    sort: "newest",
  })
})
