export function normalizeSelectedStrings(selected: string[]): string[] {
  return selected
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export function normalizeUnknownSelectedStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === "string" ? item : ""))
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}
