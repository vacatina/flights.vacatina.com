export interface RoomOffer {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  cancellationPolicy: string
  boardType?: string
}

export interface HotelRateResult {
  hotelId: string
  name: string
  latitude: number
  longitude: number
  starRating: number
  address: string
  thumbnailUrl?: string
  offers: RoomOffer[]
}

// In a real application, you'd map the raw LiteAPI response 
// into these types so the UI doesn't depend on raw API structures.
export function mapLiteApiRatesResponse(rawRatesResponse: any): HotelRateResult[] {
  if (!rawRatesResponse || !rawRatesResponse.data) {
    return []
  }

  // Example placeholder mapping logic
  return rawRatesResponse.data.map((hotel: any) => ({
    hotelId: hotel.hotelId || "unknown",
    name: hotel.name || "Unknown Hotel",
    latitude: hotel.latitude || 0,
    longitude: hotel.longitude || 0,
    starRating: hotel.starRating || 0,
    address: hotel.address || "",
    offers: hotel.rates?.map((rate: any) => ({
      id: rate.rateId,
      name: rate.roomName,
      price: rate.price,
      currency: rate.currency,
      cancellationPolicy: rate.cancellationPolicy || "Non-refundable",
    })) || [],
  }))
}
