import { getData, getName } from "country-list"

export interface VisaCountry {
  code: string
  name: string
  emoji: string
}

function countryCodeToEmoji(code: string) {
  return code
    .toUpperCase()
    .split("")
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("")
}

export const visaCountries: VisaCountry[] = getData()
  .map((country) => ({
    code: country.code,
    name: country.name,
    emoji: countryCodeToEmoji(country.code),
  }))
  .sort((left, right) => left.name.localeCompare(right.name))

export function getVisaCountry(code: string): VisaCountry | null {
  const normalizedCode = code.trim().toUpperCase()
  const name = getName(normalizedCode)

  return name
    ? {
        code: normalizedCode,
        name,
        emoji: countryCodeToEmoji(normalizedCode),
      }
    : null
}
