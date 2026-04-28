import "server-only"

import { parseIntegerFromEnv } from "@/lib/shared/env"
import { clamp } from "@/lib/shared/number"

const DEFAULT_FROM_EMAIL = "Vacatina <no-reply@vacatina.com>"
const DEFAULT_BATCH_LIMIT = 20
const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_RETRY_DELAY_MS = 5 * 60 * 1000

export interface NotificationsServerConfig {
  resendApiKey: string | null
  fromEmail: string
  dispatchBatchLimit: number
  maxAttempts: number
  retryDelayMs: number
  dispatchSecret: string | null
}

let cachedConfig: NotificationsServerConfig | null = null

export function getNotificationsServerConfig(): NotificationsServerConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  cachedConfig = {
    resendApiKey: process.env.RESEND_API_KEY?.trim() || null,
    fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL,
    dispatchBatchLimit: clamp(
      parseIntegerFromEnv("NOTIFICATIONS_DISPATCH_BATCH_LIMIT", DEFAULT_BATCH_LIMIT),
      1,
      200
    ),
    maxAttempts: clamp(
      parseIntegerFromEnv("NOTIFICATIONS_MAX_ATTEMPTS", DEFAULT_MAX_ATTEMPTS),
      1,
      20
    ),
    retryDelayMs: clamp(
      parseIntegerFromEnv("NOTIFICATIONS_RETRY_DELAY_MS", DEFAULT_RETRY_DELAY_MS),
      60_000,
      24 * 60 * 60 * 1000
    ),
    dispatchSecret: process.env.NOTIFICATIONS_DISPATCH_SECRET?.trim() || null,
  }

  return cachedConfig
}
