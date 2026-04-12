"use client"

import dynamic from "next/dynamic"
import type { CreateOrderPassenger, CreateOrderService, Offer, SeatMap } from "@duffel/api/types"
import type { OnPayloadReadyMetadata } from "@duffel/components"

import type { CheckoutAncillaryPayloadMetadata } from "@/modules/flights/checkout/domain"

const DuffelAncillaries = dynamic(
  async () => {
    const mod = await import("@duffel/components")
    return mod.DuffelAncillaries
  },
  {
    ssr: false,
  }
)

interface DuffelAncillariesPanelProps {
  offer: Offer
  seatMaps: SeatMap[]
  passengers: CreateOrderPassenger[]
  disabled?: boolean
  onSelectionChange: (input: {
    services: CreateOrderService[]
    metadata: CheckoutAncillaryPayloadMetadata
  }) => void
}

export function DuffelAncillariesPanel({
  offer,
  seatMaps,
  passengers,
  disabled = false,
  onSelectionChange,
}: DuffelAncillariesPanelProps) {
  return (
    <div className="space-y-2">
      {disabled ? (
        <p className="text-sm text-muted-foreground">
          Extras are available only with Pay now.
        </p>
      ) : null}
      <div className={disabled ? "pointer-events-none opacity-60" : ""}>
        <DuffelAncillaries
          offer={offer}
          seat_maps={seatMaps}
          passengers={passengers}
          services={["bags", "seats"]}
          onPayloadReady={(data, metadata) => {
            onSelectionChange({
              services: data.services ?? [],
              metadata: toMetadata(metadata),
            })
          }}
          debug={false}
        />
      </div>
    </div>
  )
}

function toMetadata(metadata: OnPayloadReadyMetadata): CheckoutAncillaryPayloadMetadata {
  return {
    offer_total_amount: metadata.offer_total_amount,
    offer_total_currency: metadata.offer_total_currency,
    baggage_services: metadata.baggage_services.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      total_amount: item.serviceInformation.total_amount,
    })),
    seat_services: metadata.seat_services.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      total_amount: item.serviceInformation.total_amount,
    })),
    cancel_for_any_reason_services: metadata.cancel_for_any_reason_services.map(
      (item) => ({
        id: item.id,
        quantity: item.quantity,
        total_amount: item.serviceInformation.total_amount,
      })
    ),
  }
}
