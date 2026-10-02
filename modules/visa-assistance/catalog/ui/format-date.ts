export function formatListingDate(value: Date | null) {
  if (!value) return "Not reviewed"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Colombo",
  }).format(value)
}
