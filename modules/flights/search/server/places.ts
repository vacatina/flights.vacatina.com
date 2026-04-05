import { getDuffelClient } from "@/lib/duffel"
import {
  dedupeSuggestionsById,
  normalizePlaceSuggestion,
} from "@/modules/flights/search/server/place-normalizer"
import { logFlightFlow, logFlightFlowError } from "@/modules/flights/shared/flow-debug"

export async function searchPlaceSuggestions(query: string) {
  logFlightFlow("searchPlaceSuggestions", "start", {
    query,
    queryLength: query.length,
  })

  const client = getDuffelClient()
  try {
    const response = await client.suggestions.list({ query })

    logFlightFlow("searchPlaceSuggestions", "upstream_response", {
      rawSuggestionCount: response.data.length,
    })

    const normalized = response.data
      .map(normalizePlaceSuggestion)
      .filter((option): option is NonNullable<typeof option> => option !== null)

    const deduped = dedupeSuggestionsById(normalized)

    logFlightFlow("searchPlaceSuggestions", "success", {
      normalizedCount: normalized.length,
      dedupedCount: deduped.length,
    })

    return deduped
  } catch (error) {
    logFlightFlowError("searchPlaceSuggestions", "failed", error, { query })
    throw error
  }
}
