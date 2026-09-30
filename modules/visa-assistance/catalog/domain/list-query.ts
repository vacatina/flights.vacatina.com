export function visaListingDirectoryHref(input: {
  search?: string
  status?: string
  page?: number
}) {
  const query = new URLSearchParams()
  if (input.search?.trim()) query.set("q", input.search.trim())
  if (input.status === "draft" || input.status === "published")
    query.set("status", input.status)
  if (input.page && input.page > 1) query.set("page", String(input.page))
  return `/admin/visa-listings${query.size ? `?${query}` : ""}`
}
