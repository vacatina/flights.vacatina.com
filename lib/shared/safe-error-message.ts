const BLOCKED_ERROR_FRAGMENTS = [
  "Failed query:",
  "insert into",
  "select ",
  "update ",
  "delete from",
  "violates",
  "stack",
  "SQLSTATE",
  "params:",
]

export function toSafeUserErrorMessage(
  message: string | null | undefined,
  fallback: string
) {
  if (!message) {
    return fallback
  }

  const normalized = message.trim()

  if (!normalized) {
    return fallback
  }

  if (
    BLOCKED_ERROR_FRAGMENTS.some((fragment) =>
      normalized.toLowerCase().includes(fragment.toLowerCase())
    )
  ) {
    return fallback
  }

  return normalized
}
