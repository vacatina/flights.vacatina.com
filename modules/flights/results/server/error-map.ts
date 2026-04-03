export function mapDuffelErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (!error || typeof error !== "object") {
    return fallbackMessage
  }

  const maybeError = error as {
    errors?: Array<{ title?: string; message?: string }>
    message?: string
  }

  const firstUpstreamError = maybeError.errors?.[0]

  if (firstUpstreamError?.message) {
    return firstUpstreamError.message
  }

  if (firstUpstreamError?.title) {
    return firstUpstreamError.title
  }

  if (maybeError.message) {
    return maybeError.message
  }

  return fallbackMessage
}

export function logDuffelError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
) {
  const maybeError = error as {
    status?: number
    message?: string
    errors?: unknown
    meta?: unknown
    headers?: {
      get?: (name: string) => string | null
    }
  }

  const requestId =
    typeof maybeError?.headers?.get === "function"
      ? maybeError.headers.get("x-request-id")
      : null

  console.error(`[flights/results] ${context}`, {
    ...metadata,
    status: maybeError?.status,
    requestId: requestId ?? undefined,
    message: maybeError?.message,
    errors: maybeError?.errors,
    meta: maybeError?.meta,
  })

  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }
}
