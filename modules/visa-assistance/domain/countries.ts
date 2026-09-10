import { getData, getName } from "country-list"

export interface VisaCountry {
  code: string
  name: string
  flagSrc: string
}

export function getCountryFlagSrc(code: string) {
  return `/flags/${code.trim().toLowerCase()}.svg`
}

export const visaCountries: VisaCountry[] = getData()
  .map((country) => ({
    code: country.code,
    name: country.name,
    flagSrc: getCountryFlagSrc(country.code),
  }))
  .sort((left, right) => left.name.localeCompare(right.name))

export function getVisaCountry(code: string): VisaCountry | null {
  const normalizedCode = code.trim().toUpperCase()
  const name = getName(normalizedCode)

  return name
    ? {
        code: normalizedCode,
        name,
        flagSrc: getCountryFlagSrc(normalizedCode),
      }
    : null
}
