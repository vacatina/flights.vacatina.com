const ENABLED_VALUES = new Set(["1", "true", "yes", "on"])

export function isMultiCitySearchEnabled() {
  const raw = process.env.NEXT_PUBLIC_MULTI_CITY_ENABLED

  if (!raw) {
    return false
  }

  return ENABLED_VALUES.has(raw.trim().toLowerCase())
}
