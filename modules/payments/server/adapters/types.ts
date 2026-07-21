import type { PaymentProvider } from "@/modules/payments/domain"

export interface PayableResourceFulfillmentResult {
  status: "fulfilled" | "already_fulfilled" | "finalizing" | "reconciliation_required"
  externalOrderId?: string | null
}

export interface PayableResourceAdapter {
  resourceType: string
  fulfill(input: {
    internalOrderId: string
    paymentAttemptId: string
    provider: PaymentProvider
    providerPaymentId: string | null
    now: Date
  }): Promise<PayableResourceFulfillmentResult>
}
