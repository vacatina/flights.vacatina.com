import "server-only"

import { logFlightFlow } from "@/lib/logging/flow-debug"

export type CheckoutMetricName =
  | "checkout_started"
  | "checkout_submit_success"
  | "checkout_submit_failed"
  | "payment_authorized"
  | "order_created"
  | "quote_consumed"
  | "payhere_start_total"
  | "payhere_notify_total"
  | "payhere_notify_invalid_sig_total"
  | "checkout_payment_success_total"
  | "checkout_payment_failed_total"
  | "checkout_reconciliation_required_total"

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
