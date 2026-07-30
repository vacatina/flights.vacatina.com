export const flightCancellationStatuses = [
  "requested",
  "quote_pending",
  "quote_ready",
  "admin_review_required",
  "duffel_confirming",
  "duffel_cancelled",
  "manual_processing",
  "refund_pending",
  "refund_completed",
  "completed",
  "rejected",
  "failed",
] as const

export const flightCancellationFeeTypes = ["none", "fixed", "percent"] as const

export const flightRefundStatuses = [
  "pending",
  "approved",
  "processing",
  "completed",
  "failed",
  "manual_completed",
] as const

export const flightCancellationEventActorTypes = [
  "customer",
  "guest",
  "admin",
  "system",
] as const

export type FlightCancellationStatus =
  (typeof flightCancellationStatuses)[number]
export type FlightCancellationFeeType =
  (typeof flightCancellationFeeTypes)[number]
export type FlightRefundStatus = (typeof flightRefundStatuses)[number]
export type FlightCancellationEventActorType =
  (typeof flightCancellationEventActorTypes)[number]

export interface CancellationFeeInput {
  feeType: FlightCancellationFeeType | null | undefined
  feeValue: number | string | null | undefined
  baseAmount: number | string | null | undefined
  currency: string
}

export interface CancellationRefundInput {
  airlineRefundAmount: number | string | null | undefined
  feeAmount: number | string | null | undefined
  capturedPaymentAmount: number | string | null | undefined
  currency: string
}

const terminalStatuses = new Set<FlightCancellationStatus>([
  "completed",
  "rejected",
  "failed",
])

const activeStatuses = new Set<FlightCancellationStatus>(
  flightCancellationStatuses.filter((status) => !terminalStatuses.has(status))
)

const allowedStatusTransitions: Record<
  FlightCancellationStatus,
  readonly FlightCancellationStatus[]
> = {
  requested: [
    "quote_pending",
    "quote_ready",
    "admin_review_required",
    "manual_processing",
    "refund_pending",
    "rejected",
    "failed",
  ],
  quote_pending: [
    "quote_ready",
    "admin_review_required",
    "manual_processing",
    "failed",
  ],
  quote_ready: [
    "admin_review_required",
    "duffel_confirming",
    "manual_processing",
    "rejected",
    "failed",
  ],
  admin_review_required: [
    "duffel_confirming",
    "manual_processing",
    "refund_pending",
    "rejected",
    "failed",
  ],
  duffel_confirming: ["duffel_cancelled", "manual_processing", "failed"],
  duffel_cancelled: ["refund_pending", "completed", "failed"],
  manual_processing: ["refund_pending", "completed", "rejected", "failed"],
  refund_pending: ["refund_completed", "manual_processing", "completed", "failed"],
  refund_completed: ["completed", "failed"],
  completed: [],
  rejected: ["requested"],
  failed: ["manual_processing", "requested"],
}

export function isTerminalCancellationStatus(status: FlightCancellationStatus) {
  return terminalStatuses.has(status)
}

export function isActiveCancellationStatus(status: FlightCancellationStatus) {
  return activeStatuses.has(status)
}

export function getAllowedCancellationStatusTransitions(
  status: FlightCancellationStatus
) {
  return allowedStatusTransitions[status]
}

export function canTransitionCancellationStatus(
  from: FlightCancellationStatus,
  to: FlightCancellationStatus
) {
  if (from === to) {
    return true
  }

  return allowedStatusTransitions[from].includes(to)
}

export function calculateCancellationFee(input: CancellationFeeInput) {
  const currency = normalizeCurrency(input.currency)
  const feeValue = toSafeAmount(input.feeValue)
  const baseAmount = toSafeAmount(input.baseAmount)

  if (input.feeType === "fixed") {
    return roundToMinorUnit(Math.max(0, feeValue), currency)
  }

  if (input.feeType === "percent") {
    return roundToMinorUnit(
      Math.max(0, baseAmount * (feeValue / 100)),
      currency
    )
  }

  return 0
}

export function capCustomerRefundAmount(input: CancellationRefundInput) {
  const currency = normalizeCurrency(input.currency)
  const airlineRefund = toSafeAmount(input.airlineRefundAmount)
  const fee = toSafeAmount(input.feeAmount)
  const capturedPayment = toSafeAmount(input.capturedPaymentAmount)
  const netRefund = Math.max(0, airlineRefund - fee)

  return roundToMinorUnit(Math.min(netRefund, capturedPayment), currency)
}

export function isRejectedCancellationCooldownActive(input: {
  rejectedAt: Date | null | undefined
  now?: Date
  cooldownMinutes?: number | string | null
}) {
  if (!input.rejectedAt) {
    return false
  }

  const cooldownMinutes = resolveCooldownMinutes(input.cooldownMinutes)

  if (cooldownMinutes <= 0) {
    return false
  }

  const now = input.now ?? new Date()
  const cooldownEndsAt = getRejectedCancellationCooldownEndsAt({
    rejectedAt: input.rejectedAt,
    cooldownMinutes,
  })

  return cooldownEndsAt.getTime() > now.getTime()
}

export function getRejectedCancellationCooldownEndsAt(input: {
  rejectedAt: Date
  cooldownMinutes?: number | string | null
}) {
  const cooldownMinutes = resolveCooldownMinutes(input.cooldownMinutes)
  return new Date(input.rejectedAt.getTime() + cooldownMinutes * 60_000)
}

export function resolveCooldownMinutes(value?: number | string | null) {
  const parsed = Number(
    value ?? process.env.FLIGHT_CANCELLATION_REJECTION_COOLDOWN_MINUTES
  )

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 10
  }

  return parsed
}

function toSafeAmount(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeCurrency(currency: string) {
  const normalized = currency.trim().toUpperCase()
  return normalized || "USD"
}

function roundToMinorUnit(amount: number, currency: string) {
  const factor = currencyMinorUnit(currency)
  return Math.round(amount * factor) / factor
}

function currencyMinorUnit(currency: string) {
  if (
    [
      "BIF",
      "CLP",
      "DJF",
      "GNF",
      "ISK",
      "JPY",
      "KMF",
      "KRW",
      "PYG",
      "RWF",
      "UGX",
      "UYI",
      "VND",
      "VUV",
      "XAF",
      "XOF",
      "XPF",
    ].includes(currency)
  ) {
    return 1
  }

  if (["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"].includes(currency)) {
    return 1000
  }

  return 100
}
