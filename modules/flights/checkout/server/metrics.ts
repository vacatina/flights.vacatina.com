import "server-only"

import { logFlightFlow } from "@/lib/logging/flow-debug"

export type CheckoutMetricName =
  | "checkout_started"
  | "checkout_submit_success"
  | "checkout_submit_failed"
  | "payment_authorized"
  | "order_created"
  | "quote_consumed"
  | "paypal_order_create_total"
  | "paypal_capture_total"
  | "paypal_webhook_total"
  | "paypal_webhook_invalid_sig_total"
  | "payment_fulfillment_enqueued_total"
  | "checkout_payment_success_total"
  | "checkout_payment_failed_total"
  | "checkout_reconciliation_required_total"

export interface CheckoutTelemetryAdapter {
  increment: (input: {
    name: CheckoutMetricName
    metadata?: Record<string, unknown>
  }) => number | null
}

function createLogTelemetryAdapter(): CheckoutTelemetryAdapter {
  return {
    increment(input) {
      logFlightFlow("checkout.metrics", "counter_incremented", {
        name: input.name,
        value: null,
        ...input.metadata,
      })

      return null
    },
  }
}

function createInMemoryTelemetryAdapter(): CheckoutTelemetryAdapter {
  return {
    increment(input) {
      const value = (testCounters.get(input.name) ?? 0) + 1
      testCounters.set(input.name, value)

      logFlightFlow("checkout.metrics", "counter_incremented", {
        name: input.name,
        value,
        ...input.metadata,
      })

      return value
    },
  }
}

const testCounters = new Map<CheckoutMetricName, number>()
let telemetryAdapter: CheckoutTelemetryAdapter = createLogTelemetryAdapter()

export function incrementCheckoutMetric(
  name: CheckoutMetricName,
  metadata?: Record<string, unknown>
) {
  return telemetryAdapter.increment({
    name,
    metadata,
  })
}

export function setCheckoutTelemetryAdapter(adapter: CheckoutTelemetryAdapter) {
  telemetryAdapter = adapter
}

export function resetCheckoutTelemetryAdapter() {
  telemetryAdapter = createLogTelemetryAdapter()
}

export function getCheckoutMetricValue(name: CheckoutMetricName) {
  return testCounters.get(name) ?? 0
}

export function resetCheckoutMetricsForTests() {
  testCounters.clear()
  telemetryAdapter = createInMemoryTelemetryAdapter()
}
