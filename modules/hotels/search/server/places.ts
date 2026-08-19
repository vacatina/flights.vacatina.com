"use server"

import { getLiteApiClient } from "@/lib/liteapi"
import { actionFailure, actionSuccess, type ActionResult } from "@/modules/hotels/shared/server/types"
import { logHotelFlow, logHotelFlowError } from "@/modules/hotels/shared/server/actions-logger"

export interface HotelPlaceSuggestion {
  placeId: string
  displayName: string
  formattedAddress: string
}

export async function searchHotelDestinations(query: string): Promise<ActionResult<HotelPlaceSuggestion[]>> {
  logHotelFlow("searchHotelDestinations", "started", { query })
  const client = getLiteApiClient()

  try {
    const response = await client.get<{ data: HotelPlaceSuggestion[] }>(`/data/places?textQuery=${encodeURIComponent(query)}&type=locality,airport,hotel`)
    const suggestions = response.data || []
    
    logHotelFlow("searchHotelDestinations", "success", { count: suggestions.length })
    return actionSuccess(suggestions)
  } catch (error) {
    logHotelFlowError("searchHotelDestinations", "failed", error)
    return actionFailure("UPSTREAM_ERROR", "Failed to retrieve hotel destinations from LiteAPI.")
  }
}
