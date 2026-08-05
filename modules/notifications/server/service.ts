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
  } = {},
  deps: NotificationsServiceDeps = defaultDeps
) {
  const config = getNotificationsServerConfig()
  const now = deps.now()
  const pending = await deps.outboxRepository.findPending(
    now,
    input.limit ?? config.dispatchBatchLimit
  )
  let sentCount = 0
  let failedCount = 0

  for (const item of pending) {
    const content = toNotificationContent(item.eventType, item.payload)

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
        lastError: error instanceof Error ? error.message : "Notification dispatch failed",
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

function toNotificationContent(
  eventType: NotificationEventType,
  payload: NotificationOutboxPayload | null
): NotificationContent {
  const safePayload = payload ?? {
    bookingReference: "N/A",
    routeLabel: "Your trip",
    amountLabel: "Amount unavailable",
    statusLabel: "Status updated",
  }

  if (eventType === "booking_confirmed") {
    const subject = `Booking confirmed - ${safePayload.bookingReference}`
    const text = [
      `Your booking ${safePayload.bookingReference} is confirmed.`,
      `Route: ${safePayload.routeLabel}`,
      `Total: ${safePayload.amountLabel}`,
      "Thank you for booking with Vacatina.",
    ].join("\n")
    return {
      subject,
      text,
      html: wrapHtml({
        title: "Booking confirmed",
        body: [
          `Reference: <strong>${escapeHtml(safePayload.bookingReference)}</strong>`,
          `Route: ${escapeHtml(safePayload.routeLabel)}`,
          `Total: ${escapeHtml(safePayload.amountLabel)}`,
        ],
      }),
    }
  }

  if (eventType === "hold_created") {
    const subject = `Booking on hold - ${safePayload.bookingReference}`
    const text = [
      `Your booking ${safePayload.bookingReference} is on hold.`,
      `Route: ${safePayload.routeLabel}`,
      `Current amount: ${safePayload.amountLabel}`,
      "Please complete payment before the hold expires.",
    ].join("\n")
    return {
      subject,
      text,
      html: wrapHtml({
        title: "Booking on hold",
        body: [
          `Reference: <strong>${escapeHtml(safePayload.bookingReference)}</strong>`,
          `Route: ${escapeHtml(safePayload.routeLabel)}`,
          `Current amount: ${escapeHtml(safePayload.amountLabel)}`,
        ],
      }),
    }
  }

  if (eventType.startsWith("cancellation_")) {
    const businessName = safePayload.businessName ?? "Vacatina"
    const subject =
      safePayload.recipientRole === "admin"
        ? `Cancellation update - ${safePayload.bookingReference}`
        : `${safePayload.statusLabel} - ${safePayload.bookingReference}`
    const lines = [
      `Booking: ${safePayload.bookingReference}`,
      `Route: ${safePayload.routeLabel}`,
      `Status: ${safePayload.statusLabel}`,
      `Amount: ${safePayload.amountLabel}`,
      safePayload.customerMessage ? `Message: ${safePayload.customerMessage}` : null,
      safePayload.supportEmail ? `Support: ${safePayload.supportEmail}` : null,
      safePayload.supportPhone ? `Phone: ${safePayload.supportPhone}` : null,
    ].filter((line): line is string => Boolean(line))

    return {
      subject,
      text: [`${businessName} cancellation update`, ...lines].join("\n"),
      html: wrapHtml({
        title: `${businessName} cancellation update`,
        body: lines.map(escapeHtml),
      }),
    }
  }

  const subject = `Booking needs manual review - ${safePayload.bookingReference}`
  const text = [
    `Payment was received for booking ${safePayload.bookingReference}, but manual reconciliation is required.`,
    `Route: ${safePayload.routeLabel}`,
    "Our support team will contact you shortly.",
  ].join("\n")

  return {
    subject,
    text,
    html: wrapHtml({
      title: "Booking needs manual review",
      body: [
        `Reference: <strong>${escapeHtml(safePayload.bookingReference)}</strong>`,
        `Route: ${escapeHtml(safePayload.routeLabel)}`,
        "Payment received but confirmation requires manual reconciliation.",
      ],
    }),
  }
}

function wrapHtml(input: { title: string; body: string[] }) {
  const body = input.body.map((line) => `<p>${line}</p>`).join("")
  return `<div><h2>${escapeHtml(input.title)}</h2>${body}</div>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function createNotificationOutboxId() {
  return `not_${randomUUID().replaceAll("-", "")}`
}
