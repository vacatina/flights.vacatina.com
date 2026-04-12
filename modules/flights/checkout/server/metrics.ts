import "server-only"

import { logFlightFlow } from "@/modules/flights/shared/flow-debug"

export type CheckoutMetricName =
  | "checkout_started"
  | "checkout_submit_success"
  | "checkout_submit_failed"
  | "payment_authorized"
  | "order_created"
  | "quote_consumed"

const counters = new Map<CheckoutMetricName, number>()

export function incrementCheckoutMetric(
  name: CheckoutMetricName,
  metadata?: Record<string, unknown>
) {
  const value = (counters.get(name) ?? 0) + 1
  counters.set(name, value)
  logFlightFlow("checkout.metrics", "counter_incremented", {
    name,
    value,
    ...metadata,
  })
  return value
}

export function getCheckoutMetricValue(name: CheckoutMetricName) {
  return counters.get(name) ?? 0
}

export function resetCheckoutMetricsForTests() {
  counters.clear()
}
