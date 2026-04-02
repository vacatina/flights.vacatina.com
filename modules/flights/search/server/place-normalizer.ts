import type { Places as DuffelPlace } from "@duffel/api/types"

import { formatPlaceDisplayName } from "@/modules/flights/search/domain"
import type { PlaceSuggestionOption } from "@/modules/flights/search/domain"

export function normalizePlaceSuggestion(
  place: DuffelPlace
): PlaceSuggestionOption | null {
  const type = place.type === "city" || place.type === "airport" ? place.type : null

  if (!type || !place.iata_code) {
    return null
  }

  const normalizedName = normalizeNullableString(place.name)
  const normalizedCityName = normalizeNullableString(place.city_name)
  const normalizedCountryName = normalizeNullableString(place.country_name)

  if (!normalizedName) {
    return null
  }

  const normalized: PlaceSuggestionOption = {
    id: place.id,
    type,
    iataCode: place.iata_code.toUpperCase(),
    iataCityCode: place.iata_city_code ? place.iata_city_code.toUpperCase() : null,
    name: normalizedName,
    cityName: normalizedCityName,
    countryCode: place.iata_country_code.toUpperCase(),
    countryName: normalizedCountryName,
    displayName: "",
  }

  return {
    ...normalized,
    displayName: formatPlaceDisplayName(normalized),
  }
}

export function dedupeSuggestionsById(options: PlaceSuggestionOption[]) {
  const unique = new Map<string, PlaceSuggestionOption>()

  for (const option of options) {
    if (!unique.has(option.id)) {
      unique.set(option.id, option)
    }
  }

  return Array.from(unique.values())
}

function normalizeNullableString(value: string | null | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  return trimmed
}
