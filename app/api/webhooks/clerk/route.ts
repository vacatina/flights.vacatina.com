import { z } from "zod"
import { NextRequest } from "next/server"

import {
  deleteUserMirrorByClerkUserId,
  isWebhookEventProcessed,
  markWebhookEventProcessed,
  upsertUserMirror,
  verifyClerkWebhookRequest,
} from "@/modules/auth/server"
import { logFlightFlow, logFlightFlowError } from "@/modules/flights/shared/flow-debug"

const userWebhookDataSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  email_addresses: z
    .array(
      z.object({
        email_address: z.string().email(),
      })
    )
    .optional(),
})

const deletedUserWebhookDataSchema = z.object({
  id: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  const eventId = request.headers.get("svix-id")

  if (!eventId) {
    logFlightFlow("auth.webhook", "missing_svix_id_header")
    return new Response("Missing svix-id header", { status: 400 })
  }

  if (await isWebhookEventProcessed(eventId)) {
    logFlightFlow("auth.webhook", "event_already_processed", { eventId })
    return new Response("Already processed", { status: 200 })
  }

  try {
    const event = await verifyClerkWebhookRequest(request)

    logFlightFlow("auth.webhook", "event_received", {
      eventId,
      eventType: event.type,
    })

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const parsed = userWebhookDataSchema.safeParse(event.data)

        if (!parsed.success) {
          logFlightFlow("auth.webhook", "user_event_payload_invalid", {
            eventId,
            eventType: event.type,
            issueCount: parsed.error.issues.length,
          })
          return new Response("Invalid user webhook payload", { status: 400 })
        }

        const primaryEmail =
          parsed.data.email_addresses && parsed.data.email_addresses.length > 0
            ? parsed.data.email_addresses[0]?.email_address ?? null
            : null

        await upsertUserMirror({
          clerkUserId: parsed.data.id,
          primaryEmail,
          firstName: parsed.data.first_name ?? null,
          lastName: parsed.data.last_name ?? null,
          imageUrl: parsed.data.image_url ?? null,
        })
        break
      }

      case "user.deleted": {
        const parsed = deletedUserWebhookDataSchema.safeParse(event.data)

        if (!parsed.success) {
          logFlightFlow("auth.webhook", "user_deleted_payload_invalid", {
            eventId,
            issueCount: parsed.error.issues.length,
          })
          return new Response("Invalid user webhook payload", { status: 400 })
        }

        if (parsed.data.id) {
          await deleteUserMirrorByClerkUserId(parsed.data.id)
        }
        break
      }

      default: {
        logFlightFlow("auth.webhook", "event_ignored", {
          eventId,
          eventType: event.type,
        })
      }
    }

    await markWebhookEventProcessed({
      eventId,
      eventType: event.type,
    })

    logFlightFlow("auth.webhook", "webhook_processed", {
      eventId,
      eventType: event.type,
    })

    return new Response("OK", { status: 200 })
  } catch (error) {
    logFlightFlowError("auth.webhook", "webhook_failed", error, {
      eventId,
    })
    return new Response("Webhook verification failed", { status: 400 })
  }
}
