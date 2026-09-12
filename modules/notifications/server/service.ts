import "server-only"

import { randomUUID } from "node:crypto"

import type {
  NotificationContent,
  NotificationEventType,
  NotificationOutboxPayload,
} from "@/modules/notifications/domain"
import {
  defaultNotificationOutboxRepository,
  type NotificationOutboxRepository,
} from "@/modules/notifications/server/outbox-repository"
import {
  defaultNotificationProvider,
  type NotificationProvider,
} from "@/modules/notifications/server/provider"
import { getNotificationsServerConfig } from "@/modules/notifications/server/config"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"

interface NotificationsServiceDeps {
  outboxRepository: NotificationOutboxRepository
  provider: NotificationProvider
  now: () => Date
}

const defaultDeps: NotificationsServiceDeps = {
  outboxRepository: defaultNotificationOutboxRepository,
  provider: defaultNotificationProvider,
  now: () => new Date(),
}

export async function enqueueNotification(
  input: {
    eventType: NotificationEventType
    flightOrderId: string | null
    checkoutSessionId: string | null
    bookingReference: string | null
    recipientEmail: string
    recipientEmailHash: string
    payload: NotificationOutboxPayload
  },
  deps: NotificationsServiceDeps = defaultDeps
) {
  const outboxId = createNotificationOutboxId()
  const record = await deps.outboxRepository.create({
    id: outboxId,
    eventType: input.eventType,
    flightOrderId: input.flightOrderId,
    checkoutSessionId: input.checkoutSessionId,
    bookingReference: input.bookingReference,
    recipientEmail: input.recipientEmail,
    recipientEmailHash: input.recipientEmailHash,
    payload: input.payload,
  })
  logFlightFlow("notifications.service", "enqueued", {
    outboxId: record.id,
    eventType: record.eventType,
    bookingReference: record.bookingReference,
  })

  return record
}

export async function dispatchPendingNotifications(
  input: {
    limit?: number
    outboxIds?: string[]
  } = {},
  deps: NotificationsServiceDeps = defaultDeps
) {
  const config = getNotificationsServerConfig()
  const now = deps.now()
  const pending = await deps.outboxRepository.findPending(
    now,
    input.limit ?? config.dispatchBatchLimit,
    input.outboxIds
  )
  let sentCount = 0
  let failedCount = 0

  for (const item of pending) {
    const content = toNotificationContent(
      item.eventType,
      item.payload,
      config.appBaseUrl
    )

    try {
      await deps.provider.send({
        to: item.recipientEmail,
        content,
      })
      await deps.outboxRepository.markSent({
        id: item.id,
        sentAt: now,
      })
      sentCount += 1
    } catch (error) {
      failedCount += 1
      logFlightFlowError("notifications.service", "dispatch_failed", error, {
        outboxId: item.id,
        eventType: item.eventType,
      })
      const nextAttemptCount = item.attemptCount + 1
      await deps.outboxRepository.markFailed({
        id: item.id,
        lastError:
          error instanceof Error
            ? error.message
            : "Notification dispatch failed",
        nextAttemptAt: new Date(now.getTime() + config.retryDelayMs),
        permanent: nextAttemptCount >= config.maxAttempts,
      })
    }
  }

  return {
    scannedCount: pending.length,
    sentCount,
    failedCount,
  }
}

export function toNotificationContent(
  eventType: NotificationEventType,
  payload: NotificationOutboxPayload | null,
  appBaseUrl: string | null = null
): NotificationContent {
  const safePayload = payload ?? {
    bookingReference: "N/A",
    routeLabel: "Your trip",
    amountLabel: "Amount unavailable",
    statusLabel: "Status updated",
  }

  const template = notificationTemplates[eventType]
  const businessName = safePayload.businessName?.trim() || "Vacatina"
  const admin = safePayload.recipientRole === "admin"
  const title = admin ? `${template.family} attention needed` : template.title
  const actionUrl = createActionUrl(appBaseUrl, eventType, safePayload, admin)
  const logoUrl = createLogoUrl(appBaseUrl)
  const actionLabel =
    eventType === "visa_request_received"
      ? admin
        ? "Review visa request"
        : "View visa request"
      : admin
        ? "Review booking"
        : "Find your booking"
  const textLines = [
    `${businessName} — ${title}`,
    template.description,
    `Booking reference: ${safePayload.bookingReference}`,
    `Route: ${safePayload.routeLabel}`,
    `Status: ${safePayload.statusLabel}`,
    `Amount: ${safePayload.amountLabel}`,
    safePayload.customerMessage
      ? `Update: ${safePayload.customerMessage}`
      : null,
    actionUrl ? `${actionLabel}: ${actionUrl}` : null,
    safePayload.supportEmail ? `Support: ${safePayload.supportEmail}` : null,
    safePayload.supportPhone ? `Phone: ${safePayload.supportPhone}` : null,
    safePayload.supportWhatsapp
      ? `WhatsApp: ${safePayload.supportWhatsapp}`
      : null,
  ].filter((line): line is string => Boolean(line))

  return {
    subject: admin
      ? `${template.family} attention — ${safePayload.bookingReference}`
      : `${template.subject} — ${safePayload.bookingReference}`,
    text: textLines.join("\n"),
    html: renderEmail({
      businessName,
      title,
      description: admin
        ? "A customer booking needs your attention."
        : template.description,
      payload: safePayload,
      actionLabel,
      actionUrl,
      logoUrl,
    }),
  }
}

const notificationTemplates: Record<
  NotificationEventType,
  {
    family: "Booking" | "Cancellation" | "Flight change" | "Visa request"
    title: string
    subject: string
    description: string
    actionLabel: string
  }
> = {
  booking_confirmed: {
    family: "Booking",
    title: "Your booking is confirmed",
    subject: "Booking confirmed",
    description:
      "Your flight booking has been confirmed. Keep this email for your records.",
    actionLabel: "View booking",
  },
  hold_created: {
    family: "Booking",
    title: "Your booking is on hold",
    subject: "Booking on hold",
    description:
      "Your fare is reserved for a limited time. Complete payment before the hold expires.",
    actionLabel: "View booking",
  },
  reconciliation_required: {
    family: "Booking",
    title: "We are confirming your booking",
    subject: "Booking confirmation in progress",
    description:
      "Your payment was received and our team is confirming the booking. No further action is needed right now.",
    actionLabel: "View booking",
  },
  cancellation_request_received: {
    family: "Cancellation",
    title: "Your cancellation request was received",
    subject: "Cancellation request received",
    description:
      "We have received your cancellation request. Your booking remains active until the airline confirms the outcome.",
    actionLabel: "View cancellation",
  },
  cancellation_manual_review: {
    family: "Cancellation",
    title: "Your cancellation is under review",
    subject: "Cancellation under review",
    description:
      "Our flight support team is reviewing your cancellation request.",
    actionLabel: "View cancellation",
  },
  cancellation_quote_ready: {
    family: "Cancellation",
    title: "Your cancellation quote is ready",
    subject: "Cancellation quote ready",
    description: "Your cancellation details are ready for review.",
    actionLabel: "View cancellation",
  },
  cancellation_approved: {
    family: "Cancellation",
    title: "Your cancellation was approved",
    subject: "Cancellation approved",
    description:
      "Your cancellation has been approved and is being completed with the airline.",
    actionLabel: "View cancellation",
  },
  cancellation_rejected: {
    family: "Cancellation",
    title: "Your cancellation request was not approved",
    subject: "Cancellation update",
    description:
      "Your booking remains active. See the latest update or contact support if you need help.",
    actionLabel: "View cancellation",
  },
  cancellation_completed: {
    family: "Cancellation",
    title: "Your cancellation is complete",
    subject: "Cancellation complete",
    description:
      "The cancellation has been completed. Any refund will be communicated separately when applicable.",
    actionLabel: "View booking",
  },
  cancellation_refund_completed: {
    family: "Cancellation",
    title: "Your refund is complete",
    subject: "Cancellation refund complete",
    description: "Your cancellation refund has been completed.",
    actionLabel: "View booking",
  },
  cancellation_issue: {
    family: "Cancellation",
    title: "Your cancellation needs attention",
    subject: "Cancellation update",
    description:
      "Our support team is reviewing an issue with your cancellation. No further action is needed unless we contact you.",
    actionLabel: "View cancellation",
  },
  change_request_received: {
    family: "Flight change",
    title: "Your flight change request was received",
    subject: "Flight change request received",
    description:
      "We have received your flight change request. Your current booking remains unchanged while we review the options.",
    actionLabel: "View flight change",
  },
  change_offers_ready: {
    family: "Flight change",
    title: "Your flight change options are ready",
    subject: "Flight change options ready",
    description: "Your replacement flight options are ready to review.",
    actionLabel: "Review options",
  },
  change_payment_required: {
    family: "Flight change",
    title: "Payment is needed for your flight change",
    subject: "Flight change payment required",
    description:
      "Your final airline quote is ready. Review the details and complete payment to submit the change.",
    actionLabel: "Review and pay",
  },
  change_payment_received: {
    family: "Flight change",
    title: "We received your flight change payment",
    subject: "Flight change payment received",
    description:
      "Your payment was received and we are confirming the change with the airline.",
    actionLabel: "View flight change",
  },
  change_admin_review: {
    family: "Flight change",
    title: "Your flight change is under review",
    subject: "Flight change under review",
    description:
      "Your request requires a support review before it can be confirmed.",
    actionLabel: "View flight change",
  },
  change_approved: {
    family: "Flight change",
    title: "Your flight change was approved",
    subject: "Flight change approved",
    description:
      "Your flight change was approved and is being completed by our flight support team.",
    actionLabel: "View flight change",
  },
  change_rejected: {
    family: "Flight change",
    title: "Your flight change request was not approved",
    subject: "Flight change update",
    description:
      "Your existing booking remains unchanged. See the latest update or contact support if you need help.",
    actionLabel: "View flight change",
  },
  change_manual_processing: {
    family: "Flight change",
    title: "Your flight change is being handled by support",
    subject: "Flight change update",
    description:
      "Our flight support team is working on your request. Your current booking remains unchanged until we confirm the outcome.",
    actionLabel: "View flight change",
  },
  change_completed: {
    family: "Flight change",
    title: "Your flight change is confirmed",
    subject: "Flight change confirmed",
    description:
      "Your flight change has been confirmed. Your updated itinerary is available in your booking.",
    actionLabel: "View updated booking",
  },
  change_refund_approved: {
    family: "Flight change",
    title: "Your flight change refund was approved",
    subject: "Flight change refund approved",
    description:
      "Your change has been approved and the refund is being processed.",
    actionLabel: "View flight change",
  },
  change_refund_completed: {
    family: "Flight change",
    title: "Your flight change refund is complete",
    subject: "Flight change refund complete",
    description:
      "Your flight change is confirmed and the refund has been completed.",
    actionLabel: "View updated booking",
  },
  change_issue: {
    family: "Flight change",
    title: "Your flight change needs attention",
    subject: "Flight change update",
    description:
      "We are checking an issue with the airline confirmation. No further action is needed right now.",
    actionLabel: "View flight change",
  },
  visa_request_received: {
    family: "Visa request",
    title: "Your visa request was received",
    subject: "Visa request received",
    description:
      "The Vacatina visa team has received your information and documents. No payment has been taken. We will contact you with confirmed pricing and next steps.",
    actionLabel: "View visa request",
  },
}

function renderEmail(input: {
  businessName: string
  title: string
  description: string
  payload: NotificationOutboxPayload
  actionLabel: string
  actionUrl: string | null
  logoUrl: string | null
}) {
  const support = [
    input.payload.supportEmail,
    input.payload.supportPhone,
    input.payload.supportWhatsapp,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(escapeHtml)
    .join(" &middot; ")
  const message = input.payload.customerMessage
    ? `<tr><td style="padding:16px 20px;background:#f5f8ff;border-radius:8px;color:#344054;font-size:14px;line-height:22px"><strong style="color:#172033">Latest update</strong><br>${escapeHtml(input.payload.customerMessage)}</td></tr>`
    : ""
  const button = input.actionUrl
    ? `<tr><td style="padding-top:24px"><a href="${escapeAttribute(input.actionUrl)}" style="display:inline-block;background:#1749d8;border-radius:7px;color:#ffffff;font-size:14px;font-weight:700;line-height:20px;padding:12px 18px;text-decoration:none">${escapeHtml(input.actionLabel)}</a></td></tr>`
    : ""
  const logo = input.logoUrl
    ? `<img src="${escapeAttribute(input.logoUrl)}" width="184" height="40" alt="${escapeAttribute(input.businessName)}" style="display:block;border:0;max-width:184px;height:auto">`
    : `<div style="font-size:21px;font-weight:800;letter-spacing:.2px">${escapeHtml(input.businessName)}</div><div style="font-size:12px;opacity:.82;margin-top:4px">FLIGHTS</div>`
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#172033"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fa"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden"><tr><td style="background:#13357b;padding:24px 28px;color:#ffffff">${logo}</td></tr><tr><td style="padding:32px 28px 28px"><h1 style="margin:0 0 12px;font-size:25px;line-height:32px;color:#172033">${escapeHtml(input.title)}</h1><p style="margin:0;color:#475467;font-size:15px;line-height:24px">${escapeHtml(input.description)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #dfe4ec;border-radius:8px"><tr><td style="padding:12px 16px;border-bottom:1px solid #e8ebf0;color:#667085;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Booking reference</td><td align="right" style="padding:12px 16px;border-bottom:1px solid #e8ebf0;color:#1749d8;font-size:14px;font-weight:700">${escapeHtml(input.payload.bookingReference)}</td></tr><tr><td style="padding:12px 16px;color:#667085;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Route</td><td align="right" style="padding:12px 16px;color:#172033;font-size:14px;font-weight:600">${escapeHtml(input.payload.routeLabel)}</td></tr><tr><td style="padding:12px 16px;border-top:1px solid #e8ebf0;color:#667085;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Status</td><td align="right" style="padding:12px 16px;border-top:1px solid #e8ebf0;color:#172033;font-size:14px;font-weight:600">${escapeHtml(input.payload.statusLabel)}</td></tr><tr><td style="padding:12px 16px;border-top:1px solid #e8ebf0;color:#667085;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Amount</td><td align="right" style="padding:12px 16px;border-top:1px solid #e8ebf0;color:#172033;font-size:14px;font-weight:600">${escapeHtml(input.payload.amountLabel)}</td></tr></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px">${message}${button}</table></td></tr><tr><td style="padding:20px 28px;background:#f8fafc;color:#667085;font-size:12px;line-height:19px">Need help? ${support || "Contact our flight support team."}${input.payload.businessAddress ? `<br>${escapeHtml(input.payload.businessAddress)}` : ""}<br><span style="color:#98a2b3">This is an automated update from ${escapeHtml(input.businessName)}.</span></td></tr></table></td></tr></table></body></html>`
}

function createBookingUrl(
  baseUrl: string | null,
  bookingReference: string,
  admin: boolean
) {
  if (!baseUrl || bookingReference === "N/A") return null
  const encodedReference = encodeURIComponent(bookingReference)
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "")
  return admin
    ? `${normalizedBaseUrl}/admin/bookings/${encodedReference}`
    : `${normalizedBaseUrl}/booking/lookup?reference=${encodedReference}`
}

function createActionUrl(
  baseUrl: string | null,
  eventType: NotificationEventType,
  payload: NotificationOutboxPayload,
  admin: boolean
) {
  if (!baseUrl) return null

  if (eventType === "visa_request_received" && payload.applicationId) {
    const base = baseUrl.replace(/\/$/, "")
    const applicationId = encodeURIComponent(payload.applicationId)
    return admin
      ? `${base}/admin/visa-applications/${applicationId}`
      : `${base}/visa-assistance/applications/${applicationId}/confirmation`
  }

  return createBookingUrl(baseUrl, payload.bookingReference, admin)
}

function createLogoUrl(baseUrl: string | null) {
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/img/logo-light.svg` : null
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function escapeAttribute(value: string) {
  return escapeHtml(value)
}

function createNotificationOutboxId() {
  return `not_${randomUUID().replaceAll("-", "")}`
}
