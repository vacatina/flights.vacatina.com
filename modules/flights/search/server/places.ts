import { getDuffelClient } from "@/lib/duffel"
import {
  dedupeSuggestionsById,
  normalizePlaceSuggestion,
} from "@/modules/flights/search/server/place-normalizer"

export async function searchPlaceSuggestions(query: string) {
  const client = getDuffelClient()
  const response = await client.suggestions.list({ query })

  const normalized = response.data
    .map(normalizePlaceSuggestion)
    .filter((option): option is NonNullable<typeof option> => option !== null)

  return dedupeSuggestionsById(normalized)
}
