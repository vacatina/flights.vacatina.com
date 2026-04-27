import type { CreateOrderService, Offer } from "@duffel/api/types"

import { currencyMinorUnit } from "@/modules/flights/pricing/domain"
import { toNumeric } from "@/lib/shared/number"
import type {
  CheckoutAncillaryPricing,
  CheckoutAncillarySelectionInput,
} from "@/modules/flights/checkout/domain/types"

interface AncillaryMarkupConfig {
  ratePercent: number
  fixedAmount: number
}

export function normalizeAncillarySelection(
  value: CheckoutAncillarySelectionInput | null | undefined
): CheckoutAncillarySelectionInput {
  if (!value) {
    return { services: [] }
  }

  const services = (value.services ?? [])
    .filter((item) => item && typeof item.id === "string")
    .map((item) => ({
      id: item.id.trim(),
      quantity: normalizeQuantity(item.quantity),
    }))
    .filter((item) => item.id.length > 0)

  const deduped = new Map<string, CreateOrderService>()

  for (const service of services) {
    const existing = deduped.get(service.id)

    if (!existing) {
      deduped.set(service.id, service)
      continue
    }

    deduped.set(service.id, {
      id: service.id,
      quantity: existing.quantity + service.quantity,
    })
  }

  return {
    services: Array.from(deduped.values()),
    metadata: value.metadata ?? null,
  }
}

export function extractServicesFromAncillariesPayload(payload: unknown) {
  const fromRoot = extractServices((payload as { services?: unknown })?.services)

  if (fromRoot.length > 0) {
    return fromRoot
  }

  const fromData = extractServices(
    (payload as { data?: { services?: unknown } })?.data?.services
  )

  if (fromData.length > 0) {
    return fromData
  }

  return []
}

export function computeAncillaryPricing(input: {
  offer: Offer
  selectedServices: CreateOrderService[]
  expectedCurrency: string
  markup?: AncillaryMarkupConfig
}): CheckoutAncillaryPricing {
  const serviceIndex = new Map(
    input.offer.available_services.map((service) => [service.id, service] as const)
  )
  const lines: CheckoutAncillaryPricing["lines"] = []
  let netTotal = 0
  let sellTotal = 0
  const currency = input.expectedCurrency.trim().toUpperCase()
  const rate = input.markup?.ratePercent ?? 0
  const fixed = input.markup?.fixedAmount ?? 0

  for (const selectedService of input.selectedServices) {
    const service = serviceIndex.get(selectedService.id)

    if (!service) {
      continue
    }

    if (service.total_currency.trim().toUpperCase() !== currency) {
      throw new Error("Ancillary currency mismatch. Please refresh checkout.")
    }

    const netUnitAmount = toNumeric(service.total_amount)
    const sellUnitAmount = roundByCurrency(
      netUnitAmount * (1 + rate / 100) + fixed,
      currency
    )
    const netLineTotal = roundByCurrency(
      netUnitAmount * selectedService.quantity,
      currency
    )
    const sellLineTotal = roundByCurrency(
      sellUnitAmount * selectedService.quantity,
      currency
    )

    lines.push({
      id: service.id,
      quantity: selectedService.quantity,
      currency,
      netUnitAmount,
      sellUnitAmount,
      netLineTotal,
      sellLineTotal,
    })
    netTotal += netLineTotal
    sellTotal += sellLineTotal
  }

  return {
    lines,
    netTotal: roundByCurrency(netTotal, currency),
    sellTotal: roundByCurrency(sellTotal, currency),
    currency,
  }
}

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1
  }

  return Math.floor(value)
}

function extractServices(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || !item) {
        return null
      }

      const typed = item as { id?: unknown; quantity?: unknown }

      if (typeof typed.id !== "string") {
        return null
      }

      const quantity =
        typeof typed.quantity === "number" ? typed.quantity : Number(typed.quantity)

      return {
        id: typed.id,
        quantity: normalizeQuantity(quantity),
      } satisfies CreateOrderService
    })
    .filter((item): item is CreateOrderService => Boolean(item))
}

function roundByCurrency(value: number, currency: string) {
  const digits = currencyMinorUnit(currency)
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
