import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"

// For now, we reuse the flight flow logger underneath but namespace it for hotels.
// In a full implementation, you would have a dedicated logHotelFlow in flow-debug.

export function logHotelFlow(
  module: string,
  event: string,
  metadata?: Record<string, unknown>
) {
  logFlightFlow(`hotels.${module}`, event, metadata)
}

export function logHotelFlowError(
  module: string,
  event: string,
  error: unknown,
  metadata?: Record<string, unknown>
) {
  logFlightFlowError(`hotels.${module}`, event, error, metadata)
}
