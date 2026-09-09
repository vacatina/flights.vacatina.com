export type PaymentProvider = "paypal"

export type PaymentAttemptStatus =
  | "created"
  | "provider_order_created"
  | "buyer_approved"
  | "capture_pending"
  | "capture_completed"
  | "capture_denied"
  | "capture_failed"
  | "refunded"
  | "reversed"
  | "disputed"
  | "fulfillment_pending"
  | "fulfilled"
  | "reconciliation_required"
  | "cancelled"

export type PaymentEventType =
  | "PAYMENT_INITIATED"
  | "PROVIDER_ORDER_CREATED"
  | "BUYER_APPROVED"
  | "CAPTURE_REQUESTED"
  | "CAPTURE_COMPLETED"
  | "CAPTURE_PENDING"
  | "CAPTURE_DENIED"
  | "WEBHOOK_RECEIVED"
  | "WEBHOOK_PROCESSED"
  | "FULFILLMENT_REQUESTED"
  | "FULFILLMENT_COMPLETED"
  | "FULFILLMENT_FAILED"
  | "REFUND_DETECTED"
  | "REVERSAL_DETECTED"
  | "DISPUTE_DETECTED"
  | "RECONCILIATION_CHECKED"
  | "RECONCILIATION_REPAIRED"
  | "RECONCILIATION_REQUIRED"

export type PaymentWebhookInboxStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed"
  | "ignored"

export type PaymentOutboxStatus = "pending" | "processing" | "completed" | "failed"

export type PaymentOutboxTaskType =
  | "fulfill_flight_order"
  | "fulfill_paid_resource"
  | "send_receipt"
  | "notify_admin"
  | "sync_payment_state"

export type PaymentInternalOrderType = "flight_checkout" | "flight_change" | "payment_stress_test" | "hotel_checkout"

export interface PaymentOwner {
  ownerUserId: string | null
  ownerGuestId: string | null
  ownerOrgId: string | null
}
