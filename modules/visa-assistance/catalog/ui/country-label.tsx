import { getVisaCountry } from "@/modules/visa-assistance/domain/countries"
import { CountryFlag } from "@/modules/visa-assistance/ui/country-flag"

export function ListingCountryLabel({ code }: { code: string }) {
  const country = getVisaCountry(code)
  return (
    <span className="inline-flex items-center gap-2">
      {country ? <CountryFlag src={country.flagSrc} /> : null}
      <span>{country?.name ?? code}</span>
    </span>
  )
}
