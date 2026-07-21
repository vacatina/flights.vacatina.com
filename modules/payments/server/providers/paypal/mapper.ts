import type { PaymentAttemptStatus, PaymentEventType } from "@/modules/payments/domain"

export function mapPayPalCaptureStatusToAttemptStatus(
  status: string | null | undefined
): PaymentAttemptStatus {
  switch (status?.trim().toUpperCase()) {
    case "COMPLETED":
      return "capture_completed"
    case "PENDING":
      return "capture_pending"
    case "DENIED":
    case "DECLINED":
      return "capture_denied"
    case "REFUNDED":
      return "refunded"
    default:
      return "capture_failed"
  }
}

export function mapPayPalWebhookEventType(eventType: string): PaymentEventType {
  switch (eventType) {
    case "PAYMENT.CAPTURE.COMPLETED":
      return "CAPTURE_COMPLETED"
    case "PAYMENT.CAPTURE.PENDING":
      return "CAPTURE_PENDING"
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED":
      return "CAPTURE_DENIED"
    case "PAYMENT.CAPTURE.REFUNDED":
      return "REFUND_DETECTED"
    default:
      return "WEBHOOK_RECEIVED"
  }
}
