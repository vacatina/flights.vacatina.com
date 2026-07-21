import "server-only"

import {
  getPayPalCheckoutSessionIdFromResource,
  verifyPayPalWebhookSignature,
  type PayPalWebhookEvent,
} from "@/modules/payments/server/providers/paypal/client"

export { verifyPayPalWebhookSignature, type PayPalWebhookEvent }

export function getPayPalWebhookEventId(event: PayPalWebhookEvent) {
  return typeof event.id === "string" && event.id.trim() ? event.id.trim() : null
}

export function getPayPalWebhookEventType(event: PayPalWebhookEvent) {
  return typeof event.event_type === "string" && event.event_type.trim()
    ? event.event_type.trim()
    : "UNKNOWN"
}

export function getPayPalWebhookProviderOrderId(event: PayPalWebhookEvent) {
  const resourceOrderId = readPayPalResourceOrderId(event.resource)

  if (resourceOrderId) {
    return resourceOrderId
  }

  return getPayPalCheckoutSessionIdFromResource(event.resource)
}

export function getPayPalWebhookProviderCaptureId(event: PayPalWebhookEvent) {
  if (!event.resource || typeof event.resource !== "object") {
    return null
  }

  const id = (event.resource as { id?: unknown }).id
  return typeof id === "string" && id.trim() ? id.trim() : null
}

function readPayPalResourceOrderId(resource: unknown) {
  if (!resource || typeof resource !== "object") {
    return null
  }

  const value = resource as {
    supplementary_data?: {
      related_ids?: {
        order_id?: unknown
      }
    }
  }
  const orderId = value.supplementary_data?.related_ids?.order_id

  return typeof orderId === "string" && orderId.trim() ? orderId.trim() : null
}
