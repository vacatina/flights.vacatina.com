import type { VisaCountry } from "./countries"

const countrySearchAliases: Record<string, string[]> = {
  AE: ["uae"],
  BN: ["brunei"],
  BO: ["bolivia"],
  GB: ["uk", "great britain", "england"],
  IR: ["iran"],
  KP: ["north korea"],
  KR: ["south korea"],
  LA: ["laos"],
  MD: ["moldova"],
  PS: ["palestine"],
  RU: ["russia"],
  SY: ["syria"],
  TZ: ["tanzania"],
  US: ["usa", "united states of america"],
  VE: ["venezuela"],
  VN: ["vietnam"],
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim()
}

function getMatchRank(country: VisaCountry, query: string) {
  const name = normalizeSearchValue(country.name)
  const code = country.code.toLocaleLowerCase()
  const aliases = countrySearchAliases[country.code] ?? []

  if (name === query) return 0
  if (code === query || aliases.includes(query)) return 1
  if (name.startsWith(query)) return 2
  if (name.split(/\s+/).some((word) => word.startsWith(query))) return 3
  if (aliases.some((alias) => alias.startsWith(query))) return 4
  if (name.includes(query) || aliases.some((alias) => alias.includes(query))) {
    return 5
  }

  return Number.POSITIVE_INFINITY
}

export function searchVisaCountries(countries: VisaCountry[], search: string) {
  const query = normalizeSearchValue(search)

  if (!query) return countries

  return countries
    .map((country) => ({ country, rank: getMatchRank(country, query) }))
    .filter(({ rank }) => Number.isFinite(rank))
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.country.name.localeCompare(right.country.name)
    )
    .map(({ country }) => country)
}
