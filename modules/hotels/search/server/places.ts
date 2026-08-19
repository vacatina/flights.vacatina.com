import { getLiteApiClient } from "@/lib/liteapi"

export interface HotelPlaceSuggestion {
  id: string
  name: string
  countryCode: string
  type: "city" | "hotel"
}

export async function searchHotelDestinations(
  query: string
): Promise<HotelPlaceSuggestion[]> {
  if (query.length < 2) {
    return []
  }

  const client = getLiteApiClient()
  
  // LiteAPI has a /data/cities endpoint. We can search cities by country code, 
  // but for a global text search, we might need to rely on a generic search if available,
  // or fetch a static list and filter. For this infrastructure phase, we'll mock the response 
  // or use a placeholder assuming LiteAPI has a suitable lookup.
  // 
  // Let's assume a `/data/cities` endpoint takes a `cityName` or `keyword` parameter in the LiteAPI wrapper.
  try {
    // Example: GET /data/cities?countryCode=US (Real implementation would filter by text)
    // For now, returning a mock until exact LiteAPI search endpoint is refined.
    
    // const response = await client.get<{ data: any[] }>("/data/cities")
    
    return [
      { id: "LON", name: "London", countryCode: "GB", type: "city" as const },
      { id: "PAR", name: "Paris", countryCode: "FR", type: "city" as const },
      { id: "NYC", name: "New York", countryCode: "US", type: "city" as const },
    ].filter(place => place.name.toLowerCase().includes(query.toLowerCase()))
  } catch (error) {
    console.error("Failed to search hotel destinations", error)
    return []
  }
}
