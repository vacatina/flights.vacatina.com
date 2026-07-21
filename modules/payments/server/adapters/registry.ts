import type { PayableResourceAdapter } from "@/modules/payments/server/adapters/types"

const adapters = new Map<string, PayableResourceAdapter>()

export function registerPaymentAdapter(adapter: PayableResourceAdapter) {
  adapters.set(adapter.resourceType, adapter)
}

export function getPaymentAdapter(resourceType: string) {
  return adapters.get(resourceType) ?? null
}

export function resetPaymentAdaptersForTests() {
  adapters.clear()
}
