import "server-only"

import { Resend } from "resend"

import type { NotificationContent } from "@/modules/notifications/domain"
import { getNotificationsServerConfig } from "@/modules/notifications/server/config"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"

export interface NotificationProvider {
  send(input: {
    to: string
    content: NotificationContent
  }): Promise<{ messageId: string | null }>
}

let resendClient: Resend | null | undefined

export const defaultNotificationProvider: NotificationProvider = {
  async send(input) {
    const config = getNotificationsServerConfig()

    if (!config.resendApiKey) {
      logFlightFlow("notifications.provider", "send_skipped_missing_api_key", {
        recipient: maskEmail(input.to),
      })
      return { messageId: null }
    }

    try {
      const client = getResendClient(config.resendApiKey)
      const response = await client.emails.send({
        from: config.fromEmail,
        to: input.to,
        subject: input.content.subject,
        html: input.content.html,
        text: input.content.text,
      })
      return { messageId: response.data?.id ?? null }
    } catch (error) {
      logFlightFlowError("notifications.provider", "send_failed", error, {
        recipient: maskEmail(input.to),
      })
      throw error
    }
  },
}

function getResendClient(apiKey: string) {
  if (resendClient !== undefined && resendClient !== null) {
    return resendClient
  }

  resendClient = new Resend(apiKey)
  return resendClient
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@")

  if (!local || !domain) {
    return "***"
  }

  return `${local.slice(0, 2)}***@${domain}`
}
