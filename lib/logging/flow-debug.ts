type FlowMetadata = Record<string, unknown>

const TRUE_VALUES = new Set(["1", "true", "yes", "on"])
const FALSE_VALUES = new Set(["0", "false", "no", "off"])

export function logFlightFlow(
  scope: string,
  step: string,
  metadata?: FlowMetadata
) {
  if (!isFlowDebugEnabled()) {
    return
  }

  const prefix = buildPrefix(scope, step)

  if (!metadata || Object.keys(metadata).length === 0) {
    console.log(prefix)
    return
  }

  console.log(prefix, metadata)
}

export function logFlightFlowError(
  scope: string,
  step: string,
  error: unknown,
  metadata?: FlowMetadata
) {
  if (!isFlowDebugEnabled()) {
    return
  }

  const prefix = buildPrefix(scope, step)
  const errorMetadata = {
    ...metadata,
    errorMessage: error instanceof Error ? error.message : String(error),
  }

  console.error(prefix, errorMetadata)

  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
}

function buildPrefix(scope: string, step: string) {
  const runtime = typeof window === "undefined" ? "server" : "client"
  return `[flights/flow] [${runtime}] [${scope}] ${step}`
}

function isFlowDebugEnabled() {
  const serverOverride = normalizeDebugFlag(process.env.FLIGHTS_DEBUG)
  const publicOverride = normalizeDebugFlag(process.env.NEXT_PUBLIC_FLIGHTS_DEBUG)
  const override = typeof window === "undefined" ? serverOverride ?? publicOverride : publicOverride

  if (override !== null) {
    return override
  }

  return process.env.NODE_ENV === "development"
}

function normalizeDebugFlag(value: string | undefined): boolean | null {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()

  if (TRUE_VALUES.has(normalized)) {
    return true
  }

  if (FALSE_VALUES.has(normalized)) {
    return false
  }

  return null
}
