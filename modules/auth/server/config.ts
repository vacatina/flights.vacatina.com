const DEFAULT_GUEST_SESSION_COOKIE_NAME = "guest_session"
const DEFAULT_GUEST_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const DEFAULT_GUEST_SESSION_SECRET = "local-guest-session-secret"

export interface AuthServerConfig {
  clerkEnabled: boolean
  clerkWebhookSigningSecretConfigured: boolean
  guestSessionCookieName: string
  guestSessionTtlMs: number
  guestSessionSecret: string
}

let cachedConfig: AuthServerConfig | null = null

export function getAuthServerConfig(): AuthServerConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const guestSessionCookieName =
    process.env.AUTH_GUEST_SESSION_COOKIE_NAME?.trim() ||
    DEFAULT_GUEST_SESSION_COOKIE_NAME

  const guestSessionTtlMs = clamp(
    parseIntegerFromEnv("AUTH_GUEST_SESSION_TTL_MS", DEFAULT_GUEST_SESSION_TTL_MS),
    5 * 60 * 1000,
    365 * 24 * 60 * 60 * 1000
  )

  const guestSessionSecret = resolveGuestSessionSecret()

  cachedConfig = {
    clerkEnabled: isClerkConfigured(),
    clerkWebhookSigningSecretConfigured: isClerkWebhookSigningSecretConfigured(),
    guestSessionCookieName,
    guestSessionTtlMs,
    guestSessionSecret,
  }

  return cachedConfig
}

export function isClerkConfigured() {
  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const secret = process.env.CLERK_SECRET_KEY

  return Boolean(publishable && secret)
}

export function isClerkWebhookSigningSecretConfigured() {
  return Boolean(process.env.CLERK_WEBHOOK_SIGNING_SECRET)
}

function resolveGuestSessionSecret() {
  return (
    process.env.AUTH_GUEST_SESSION_SECRET?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim() ||
    DEFAULT_GUEST_SESSION_SECRET
  )
}

function parseIntegerFromEnv(name: string, fallback: number) {
  const raw = process.env[name]

  if (!raw) {
    return fallback
  }

  const parsed = Number.parseInt(raw, 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  return parsed
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
