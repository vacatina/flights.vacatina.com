import { expect, test } from "vitest"

import { parseAdminPaymentListQuery } from "@/modules/payments/domain/admin-schema"

test("parseAdminPaymentListQuery keeps supported payment filters", () => {
  expect(
    parseAdminPaymentListQuery({
      page: "2",
      pageSize: "50",
      q: "  BK-123  ",
      paymentStatus: "attention",
      refundStatus: "pending",
      sort: "amount_high",
    })
  ).toEqual({
    page: 2,
    pageSize: 50,
    q: "BK-123",
    paymentStatus: "attention",
    refundStatus: "pending",
    sort: "amount_high",
  })
})

test("parseAdminPaymentListQuery safely resets unsupported values", () => {
  expect(
    parseAdminPaymentListQuery({
      page: "invalid",
      pageSize: "500",
      paymentStatus: "unknown",
      refundStatus: "unknown",
      sort: "unknown",
    })
  ).toEqual({
    page: 1,
    pageSize: 20,
    q: undefined,
    paymentStatus: "all",
    refundStatus: "all",
    sort: "newest",
  })
})
