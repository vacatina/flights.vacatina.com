import "server-only"

import {
  calculateCancellationFee,
  resolveCooldownMinutes,
  type FlightCancellationFeeType,
} from "@/modules/flights/cancellations/domain"

export interface CancellationServerConfig {
  rejectionCooldownMinutes: number
  defaultFeeType: FlightCancellationFeeType
  defaultFeeValue: number
}

export function getCancellationServerConfig(): CancellationServerConfig {
  const defaultFeeType = parseFeeType(
    process.env.FLIGHT_CANCELLATION_DEFAULT_FEE_TYPE
  )
  const defaultFeeValue = parseAmount(
    process.env.FLIGHT_CANCELLATION_DEFAULT_FEE_VALUE
  )

  return {
    rejectionCooldownMinutes: resolveCooldownMinutes(
      process.env.FLIGHT_CANCELLATION_REJECTION_COOLDOWN_MINUTES
    ),
    defaultFeeType,
    defaultFeeValue: defaultFeeType === "none" ? 0 : defaultFeeValue,
  }
}

export function calculateDefaultCancellationFee(input: {
  baseAmount: number
  currency: string
  config?: CancellationServerConfig
}) {
  const config = input.config ?? getCancellationServerConfig()

  return calculateCancellationFee({
    feeType: config.defaultFeeType,
    feeValue: config.defaultFeeValue,
    baseAmount: input.baseAmount,
    currency: input.currency,
  })
}

function parseFeeType(
  value: string | undefined
): FlightCancellationFeeType {
  if (value === "fixed" || value === "percent") {
    return value
  }

  return "none"
}

function parseAmount(value: string | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}
