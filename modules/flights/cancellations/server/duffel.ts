import "server-only"

import type { Order, OrderCancellation } from "@duffel/api/types"

import { getDuffelClient } from "@/lib/duffel"

export interface DuffelCancellationQuoteResult {
  id: string
  refundAmount: number | null
  refundCurrency: string | null
  refundTo: string | null
  expiresAt: Date | null
  confirmedAt: Date | null
  rawPayload: OrderCancellation
}

export interface DuffelOrderResult {
  id: string
  availableActions: string[]
  rawPayload: Order
}

export interface DuffelCancellationService {
  getOrder(orderId: string): Promise<DuffelOrderResult>
  createCancellationQuote(orderId: string): Promise<DuffelCancellationQuoteResult>
  confirmCancellationQuote(
    orderCancellationId: string
  ): Promise<DuffelCancellationQuoteResult>
}

export const defaultDuffelCancellationService: DuffelCancellationService = {
  async getOrder(orderId) {
    const response = await getDuffelClient().orders.get(orderId)
    const order = response.data

    return {
      id: order.id,
      availableActions: Array.isArray(order.available_actions)
        ? order.available_actions
        : [],
      rawPayload: order,
    }
  },
  async createCancellationQuote(orderId) {
    const response = await getDuffelClient().orderCancellations.create({
      order_id: orderId,
    })
    return toQuoteResult(response.data)
  },
  async confirmCancellationQuote(orderCancellationId) {
    const response = await getDuffelClient().orderCancellations.confirm(
      orderCancellationId
    )
    return toQuoteResult(response.data)
  },
}

export function hasDuffelCancelAction(order: { availableActions: string[] }) {
  return order.availableActions.includes("cancel")
}

function toQuoteResult(
  cancellation: OrderCancellation
): DuffelCancellationQuoteResult {
  return {
    id: cancellation.id,
    refundAmount:
      cancellation.refund_amount === null ? null : Number(cancellation.refund_amount),
    refundCurrency: cancellation.refund_currency,
    refundTo: cancellation.refund_to,
    expiresAt: parseDuffelDate(cancellation.expires_at),
    confirmedAt: parseDuffelDate(cancellation.confirmed_at),
    rawPayload: cancellation,
  }
}

function parseDuffelDate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}
