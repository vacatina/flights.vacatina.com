import { describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  dispatchPendingNotifications,
  toNotificationContent,
} from "@/modules/notifications/server/service"
import type { NotificationOutboxPayload } from "@/modules/notifications/domain"

const payload: NotificationOutboxPayload = {
  bookingReference: "VAC-12345",
  routeLabel: "Colombo to Dubai",
  amountLabel: "USD 125.00",
  statusLabel: "Manual processing",
  customerMessage: "Our flight support team is reviewing your request.",
  businessName: "Vacatina",
  supportEmail: "support@vacatina.com",
  supportPhone: "+94 11 234 5678",
}

describe("notification templates", () => {
  test("renders a Vacatina visa request acknowledgement", () => {
    const content = toNotificationContent(
      "visa_request_received",
      {
        bookingReference: "VA-12345",
        routeLabel: "LK to IN",
        amountLabel: "$120.00",
        statusLabel: "Received",
        applicationId: "va_123",
      },
      "https://vacatina.example"
    )

    expect(content.subject).toBe("Visa request received — VA-12345")
    expect(content.text).toContain("No payment")
    expect(content.html).toContain(
      "/visa-assistance/applications/va_123/confirmation"
    )
  })

  test("renders a flight change request as a flight-change email, never a cancellation", () => {
    const content = toNotificationContent(
      "change_request_received",
      payload,
      "https://flights.vacatina.com"
    )

    expect(content.subject).toBe("Flight change request received — VAC-12345")
    expect(content.text).toContain("flight change request")
    expect(content.text.toLowerCase()).not.toContain("cancellation")
    expect(content.html).toContain("Your flight change request was received")
    expect(content.html).toContain(
      "https://flights.vacatina.com/booking/lookup?reference=VAC-12345"
    )
    expect(content.html).toContain(">Find your booking<")
    expect(content.html).toContain(
      "https://flights.vacatina.com/img/logo-light.svg"
    )
  })

  test("uses the cancellation template only for cancellation events", () => {
    const content = toNotificationContent(
      "cancellation_request_received",
      payload
    )

    expect(content.subject).toBe("Cancellation request received — VAC-12345")
    expect(content.html).toContain("Your cancellation request was received")
    expect(content.html).not.toContain(
      "Your flight change request was received"
    )
  })

  test("renders a branded action button and supports administrative review links", () => {
    const content = toNotificationContent(
      "change_completed",
      { ...payload, recipientRole: "admin" },
      "https://flights.vacatina.com/"
    )

    expect(content.subject).toBe("Flight change attention — VAC-12345")
    expect(content.html).toContain("background:#13357b")
    expect(content.html).toContain(
      "https://flights.vacatina.com/admin/bookings/VAC-12345"
    )
    expect(content.html).toContain(">Review booking<")
  })

  test("immediate delivery dispatches only the notification that triggered it", async () => {
    const sent: string[] = []
    const pending = [
      outboxRecord("old-cancellation", "cancellation_approved"),
      outboxRecord("new-booking", "booking_confirmed"),
    ]
    const repository = {
      findPending: vi.fn(async (_now, _limit, outboxIds?: string[]) =>
        pending.filter((item) => !outboxIds || outboxIds.includes(item.id))
      ),
      markSent: vi.fn(async () => {}),
      markFailed: vi.fn(async () => {}),
    }

    await dispatchPendingNotifications(
      { limit: 1, outboxIds: ["new-booking"] },
      {
        outboxRepository: repository as never,
        provider: {
          send: vi.fn(async ({ content }) => {
            sent.push(content.subject)
            return { messageId: "message_1" }
          }),
        },
        now: () => new Date("2026-08-16T16:00:00Z"),
      }
    )

    expect(sent).toEqual(["Booking confirmed — VAC-12345"])
    expect(repository.findPending).toHaveBeenCalledWith(expect.any(Date), 1, [
      "new-booking",
    ])
  })
})

function outboxRecord(
  id: string,
  eventType: "cancellation_approved" | "booking_confirmed"
) {
  return {
    id,
    eventType,
    status: "pending" as const,
    flightOrderId: "order_1",
    checkoutSessionId: "checkout_1",
    bookingReference: "VAC-12345",
    recipientEmail: "guest@example.com",
    recipientEmailHash: "hash",
    payload,
    attemptCount: 0,
    lastError: null,
    sentAt: null,
    nextAttemptAt: new Date(0),
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }
}
