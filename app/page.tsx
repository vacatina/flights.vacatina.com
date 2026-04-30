import { FlightSearch } from "@/modules/flights/search"
import { parseSearchPrefillToken } from "@/modules/flights/search/domain"

interface HomePageProps {
  searchParams: Promise<{
    prefill?: string
  }>
}

export default async function Page({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams
  const initialValues = parseSearchPrefillToken(resolvedSearchParams.prefill)

  return <FlightSearch initialValues={initialValues ?? undefined} />
}
