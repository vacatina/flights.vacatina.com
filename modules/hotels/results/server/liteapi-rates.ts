import { getLiteApiClient } from "@/lib/liteapi/client"
import type { HotelSearchCommand } from "@/modules/hotels/search/domain"

export interface LiteApiHotelInfo {
  id: string
  name: string
  main_photo: string
  address: string
  rating: number
  starRating?: number
  tags: string[]
  persona: string
  style: string
  location_type: string
  story: string
}

export interface LiteApiRateRetail {
  total: { amount: number; currency: string }[]
  taxesAndFees?: { included: boolean; amount?: number }[]
}

export interface LiteApiRate {
  rateId?: string
  name: string
  mappedRoomId: number
  boardName: string
  retailRate: LiteApiRateRetail
  cancellationPolicies: {
    refundableTag: string
    cancelPolicyInfos: { cancelTime: string }[]
  }
}

export interface LiteApiRoomType {
  offerId: string
  rates: LiteApiRate[]
}

export interface LiteApiRateResponseItem {
  hotelId: string
  roomTypes: LiteApiRoomType[]
}

export interface LiteApiRatesSearchResponse {
  data: LiteApiRateResponseItem[]
  hotels?: LiteApiHotelInfo[]
  sandbox: boolean
  guestLevel: number
}

export async function searchLiteApiRates(
  command: HotelSearchCommand
): Promise<LiteApiRatesSearchResponse> {
  const client = getLiteApiClient()

  const payload = {
    occupancies: command.occupancies,
    currency: command.currency,
    guestNationality: command.guestNationality,
    checkin: command.checkin,
    checkout: command.checkout,
    maxRatesPerHotel: 1,
    roomMapping: true,
    includeHotelData: true,
    placeId: command.placeId,
  }

  return client.post<LiteApiRatesSearchResponse>("/hotels/rates", payload)
}
