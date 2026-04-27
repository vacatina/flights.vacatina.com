import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

import { cookies } from "next/headers"

import { getAuthServerConfig } from "@/modules/auth/server/config"
import { upsertGuestSession } from "@/modules/auth/server/repository"
import type { GuestSessionPayload } from "@/modules/auth/types"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"

interface GuestSessionCookieStore {
  get: (name: string) => { value: string } | undefined
  set?: (
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean
      sameSite?: "lax" | "strict" | "none"
      secure?: boolean
      path?: string
      expires?: Date
    }
  ) => unknown
}

interface ResolveGuestSessionOptions {
  ensureGuestSession?: boolean
  now?: () => Date
  cookieStore?: GuestSessionCookieStore
  persistGuestSession?: (guestId: string, expiresAt: Date) => Promise<void>
}

export interface GuestSessionResolution {
  guestId: string | null
  created: boolean
  fromCookie: boolean
}

const TOKEN_SEPARATOR = "."

export async function resolveGuestSession(
  options: ResolveGuestSessionOptions = {}
): Promise<GuestSessionResolution> {
  const {
    ensureGuestSession = true,
    now = () => new Date(),
    persistGuestSession = defaultPersistGuestSession,
  } = options
  const config = getAuthServerConfig()
  const cookieStore = options.cookieStore ?? ((await cookies()) as GuestSessionCookieStore)

  const currentToken = cookieStore.get(config.guestSessionCookieName)?.value
  const currentPayload = verifySignedGuestSessionToken(currentToken, {
    now,
  })

  if (currentPayload) {
    try {
      await persistGuestSession(currentPayload.guestId, new Date(currentPayload.expiresAt))
    } catch (error) {
      logFlightFlowError("auth.guestSession", "persist_existing_cookie_session_failed", error, {
        guestId: currentPayload.guestId,
      })
    }

    return {
      guestId: currentPayload.guestId,
      created: false,
      fromCookie: true,
    }
  }

  if (!ensureGuestSession) {
    return {
      guestId: null,
      created: false,
      fromCookie: false,
    }
  }

  const issuedAt = now().getTime()
  const expiresAt = issuedAt + config.guestSessionTtlMs
  const guestId = createGuestSessionId()
  const token = createSignedGuestSessionToken({
    guestId,
    issuedAt,
    expiresAt,
  })

  try {
    cookieStore.set?.(config.guestSessionCookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(expiresAt),
    })
    logFlightFlow("auth.guestSession", "guest_created", {
      guestId,
      expiresAt: new Date(expiresAt).toISOString(),
    })
  } catch (error) {
    logFlightFlowError("auth.guestSession", "cookie_set_failed", error, {
      guestId,
    })
  }

  await persistGuestSession(guestId, new Date(expiresAt))

  return {
    guestId,
    created: true,
    fromCookie: false,
  }
}

export function createSignedGuestSessionToken(
  payload: GuestSessionPayload,
  secret = getAuthServerConfig().guestSessionSecret
) {
  const normalizedPayload: GuestSessionPayload = {
    guestId: payload.guestId.trim(),
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  }
  const encodedPayload = Buffer.from(JSON.stringify(normalizedPayload), "utf8").toString(
    "base64url"
  )
  const signature = signTokenPayload(encodedPayload, secret)

  return `${encodedPayload}${TOKEN_SEPARATOR}${signature}`
}

export function verifySignedGuestSessionToken(
  token: string | undefined | null,
  options: {
    now?: () => Date
    secret?: string
  } = {}
): GuestSessionPayload | null {
  if (!token || !token.includes(TOKEN_SEPARATOR)) {
    return null
  }

  const config = getAuthServerConfig()
  const now = options.now ?? (() => new Date())
  const secret = options.secret ?? config.guestSessionSecret
  const [encodedPayload, receivedSignature] = token.split(TOKEN_SEPARATOR)

  if (!encodedPayload || !receivedSignature) {
    return null
  }

  const expectedSignature = signTokenPayload(encodedPayload, secret)

  if (!isEqualSignature(expectedSignature, receivedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<GuestSessionPayload>

    if (
      typeof payload.guestId !== "string" ||
      payload.guestId.trim().length === 0 ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null
    }

    if (payload.expiresAt <= now().getTime()) {
      return null
    }

    return {
      guestId: payload.guestId,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
    }
  } catch {
    return null
  }
}

async function defaultPersistGuestSession(guestId: string, expiresAt: Date) {
  await upsertGuestSession({
    guestId,
    expiresAt,
    status: "active",
  })
}

function createGuestSessionId() {
  return `gst_${randomUUID().replaceAll("-", "")}`
}

function signTokenPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

function isEqualSignature(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected, "utf8")
  const receivedBuffer = Buffer.from(received, "utf8")

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}
