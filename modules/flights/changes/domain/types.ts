export const flightChangeRequestTypes = ["itinerary_change","add_baggage","remove_passenger","seat_change","remove_service","traveller_details_change","other"] as const
export const flightChangeHandlingModes = ["automatic","admin_approval","manual"] as const
export const flightChangePricingDirections = ["unknown","additional_payment","no_difference","customer_refund"] as const
export const flightChangeStatuses = ["requested","searching","offers_ready","pending_change_ready","payment_pending","payment_processing","payment_captured","admin_review_required","duffel_confirming","refund_pending","manual_processing","reconciliation_required","completed","rejected","expired","failed"] as const
export const flightChangeActorTypes = ["customer","guest","admin","system"] as const

export type FlightChangeRequestType = (typeof flightChangeRequestTypes)[number]
export type FlightChangeHandlingMode = (typeof flightChangeHandlingModes)[number]
export type FlightChangePricingDirection = (typeof flightChangePricingDirections)[number]
export type FlightChangeStatus = (typeof flightChangeStatuses)[number]
export type FlightChangeActorType = (typeof flightChangeActorTypes)[number]

const terminal = new Set<FlightChangeStatus>(["completed", "rejected", "expired"])
const transitions: Record<FlightChangeStatus, readonly FlightChangeStatus[]> = {
  requested: ["searching","manual_processing","admin_review_required","rejected","expired","failed"],
  searching: ["offers_ready","manual_processing","expired","failed"],
  offers_ready: ["pending_change_ready","searching","manual_processing","expired","failed"],
  pending_change_ready: ["payment_pending","admin_review_required","duffel_confirming","manual_processing","expired","failed"],
  payment_pending: ["payment_processing","expired","manual_processing","failed"],
  payment_processing: ["payment_captured","payment_pending","reconciliation_required","failed"],
  payment_captured: ["duffel_confirming","reconciliation_required","manual_processing"],
  admin_review_required: ["duffel_confirming","manual_processing","rejected","expired","failed"],
  duffel_confirming: ["completed","reconciliation_required","manual_processing","failed"],
  refund_pending: ["completed","reconciliation_required","manual_processing","failed"],
  manual_processing: ["completed","rejected","reconciliation_required","failed"],
  reconciliation_required: ["manual_processing","duffel_confirming","completed","rejected"],
  completed: [], rejected: [], expired: ["searching"], failed: ["manual_processing","searching"],
}

export function isTerminalChangeStatus(status: FlightChangeStatus) { return terminal.has(status) }
export function isActiveChangeStatus(status: FlightChangeStatus) { return !terminal.has(status) }
export function canTransitionChangeStatus(from: FlightChangeStatus, to: FlightChangeStatus) {
  return from === to || transitions[from].includes(to)
}
export function assertChangeStatusTransition(from: FlightChangeStatus, to: FlightChangeStatus) {
  if (!canTransitionChangeStatus(from, to)) throw new Error(`Cannot move flight change from ${from} to ${to}.`)
}
export function getPricingDirection(amount: number): FlightChangePricingDirection {
  if (!Number.isFinite(amount)) throw new Error("A finite change amount is required.")
  return amount > 0 ? "additional_payment" : amount < 0 ? "customer_refund" : "no_difference"
}
export function getHandlingMode(type: FlightChangeRequestType): FlightChangeHandlingMode {
  return type === "itinerary_change" ? "automatic" : "manual"
}
export function statusForPendingAmount(amount: number): FlightChangeStatus {
  const direction = getPricingDirection(amount)
  return direction === "additional_payment" ? "payment_pending" : direction === "customer_refund" ? "admin_review_required" : "pending_change_ready"
}

