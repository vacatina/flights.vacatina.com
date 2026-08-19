export type NotificationEventType =
  | "booking_confirmed"
  | "hold_created"
  | "reconciliation_required"
  | "cancellation_request_received"
  | "cancellation_manual_review"
  | "cancellation_quote_ready"
  | "cancellation_approved"
  | "cancellation_rejected"
  | "cancellation_completed"
  | "cancellation_refund_completed"
  | "cancellation_issue"
  | "change_request_received"
  | "change_offers_ready"
  | "change_payment_required"
  | "change_payment_received"
  | "change_admin_review"
  | "change_approved"
  | "change_rejected"
  | "change_manual_processing"
  | "change_completed"
  | "change_refund_approved"
  | "change_refund_completed"
  | "change_issue"

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
  customerMessage?: string | null
  businessName?: string | null
  supportEmail?: string | null
  supportPhone?: string | null
  supportWhatsapp?: string | null
  businessAddress?: string | null
  recipientRole?: "customer" | "admin"
}
