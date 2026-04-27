import { auth } from "@clerk/nextjs/server"
import { verifyWebhook } from "@clerk/nextjs/webhooks"
import type { NextRequest } from "next/server"

import { getAuthServerConfig } from "@/modules/auth/server/config"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"

export interface ClerkAuthState {
  isAuthenticated: boolean
  userId: string | null
  orgId: string | null
}

export async function getClerkAuthState(): Promise<ClerkAuthState> {
  const config = getAuthServerConfig()

  if (!config.clerkEnabled) {
    return {
      isAuthenticated: false,
      userId: null,
      orgId: null,
    }
  }

  try {
    const authState = await auth()
    const userId = authState.userId ?? null
    const orgId = authState.orgId ?? null

    return {
      isAuthenticated: Boolean(userId),
      userId,
      orgId,
    }
  } catch (error) {
    logFlightFlowError("auth.clerk", "auth_state_failed", error)

    return {
      isAuthenticated: false,
      userId: null,
      orgId: null,
    }
  }
}

export async function verifyClerkWebhookRequest(request: NextRequest) {
  const config = getAuthServerConfig()

  if (!config.clerkEnabled) {
    throw new Error("Clerk is not configured.")
  }

  if (!config.clerkWebhookSigningSecretConfigured) {
    throw new Error(
      "Missing CLERK_WEBHOOK_SIGNING_SECRET environment variable."
    )
  }

  logFlightFlow("auth.clerk", "verify_webhook_started")
  const event = await verifyWebhook(request)
  logFlightFlow("auth.clerk", "verify_webhook_succeeded", {
    eventType: event.type,
  })
  return event
}
