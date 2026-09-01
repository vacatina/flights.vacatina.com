import { getLiteApiClient } from "@/lib/liteapi/client"

export interface LiteApiPrebookData {
  prebookId: string
  hotelId: string
  price?: number // Might be inside a rate object
  currency?: string
  roomTypes?: any[]
  rate?: any
  [key: string]: any
}

export async function fetchCheckoutPageData({ prebookId }: { prebookId: string }): Promise<LiteApiPrebookData> {
  const client = getLiteApiClient()
  
  // LiteAPI endpoint to get a prebook by ID
  const response = await client.get<any>(`/prebooks/${prebookId}`)
  
  if (!response) {
    throw new Error("Prebook session not found")
  }
  
  return response.data || response
}
