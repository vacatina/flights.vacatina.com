export type NotificationEventType =
  | "booking_confirmed"
  | "hold_created"
  | "reconciliation_required"

export type NotificationOutboxStatus = "pending" | "sent" | "failed"

export interface NotificationContent {
  subject: string
  text: string
  html: string
}

export interface NotificationOutboxPayload {
  bookingReference: string
  routeLabel: string
  amountLabel: string
  statusLabel: string
}
