import { getLiteApiClient } from "@/lib/liteapi/client"

export interface LiteApiBookingData {
  bookingId: string
  hotelId: string
  status: string
  checkin?: string
  checkout?: string
  hotel?: {
    name: string
  }
  price?: number
  currency?: string
  [key: string]: any
}

export async function fetchBookingPageData({ bookingReference }: { bookingReference: string }): Promise<LiteApiBookingData> {
  const client = getLiteApiClient()
  
  // LiteAPI endpoint to get a booking by ID
  const response = await client.get<LiteApiBookingData>(`/bookings/${bookingReference}`)
  
  if (!response) {
    throw new Error("Booking session not found")
  }
  
  return response
}
