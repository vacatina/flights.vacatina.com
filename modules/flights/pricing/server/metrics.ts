import { logFlightFlow } from "@/modules/flights/shared/flow-debug"

export type PricingMetricName =
  | "pricing_rule_applied_total"
  | "pricing_passthrough_total"
  | "quote_create_total"
  | "quote_expired_total"
  | "quote_validation_failed_total"

const metricCounters = new Map<PricingMetricName, number>()

export function incrementPricingMetric(
  name: PricingMetricName,
  metadata?: Record<string, unknown>
) {
  const nextValue = (metricCounters.get(name) ?? 0) + 1
  metricCounters.set(name, nextValue)

  logFlightFlow("pricing.metrics", "counter_incremented", {
    name,
    value: nextValue,
    ...metadata,
  })
}

export function getPricingMetricValue(name: PricingMetricName) {
  return metricCounters.get(name) ?? 0
}

export function resetPricingMetricsForTests() {
  metricCounters.clear()
}
