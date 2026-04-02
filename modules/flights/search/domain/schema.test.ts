import { test } from "node:test"
import assert from "node:assert/strict"

import {
  createDefaultFlightSearchValues,
  parseFlightSearchForm,
  type PlaceSuggestionOption,
} from "@/modules/flights/search/domain"

function place(code: string, name: string, type: "airport" | "city" = "airport"): PlaceSuggestionOption {
  return {
    id: `${type}_${code.toLowerCase()}`,
    type,
    iataCode: code,
    iataCityCode: type === "airport" ? code : null,
    name,
    cityName: type === "airport" ? name : null,
    countryCode: "LK",
    countryName: "Sri Lanka",
    displayName: `${name} (${code})`,
  }
}

test("flightSearchFormSchema accepts a valid one-way payload", () => {
  const values = createDefaultFlightSearchValues()

  values.slices[0] = {
    origin: place("CMB", "Colombo"),
    destination: place("DXB", "Dubai"),
    departureDate: "2026-08-12",
    departureTime: null,
    arrivalTime: null,
  }

  const result = parseFlightSearchForm(values)

  assert.equal(result.success, true)
})

test("flightSearchFormSchema rejects return trips with invalid date order", () => {
  const values = createDefaultFlightSearchValues()

  values.journeyType = "return"
  values.slices = [
    {
      origin: place("CMB", "Colombo"),
      destination: place("DOH", "Doha"),
      departureDate: "2026-09-10",
      departureTime: null,
      arrivalTime: null,
    },
    {
      origin: place("DOH", "Doha"),
      destination: place("CMB", "Colombo"),
      departureDate: "2026-09-07",
      departureTime: null,
      arrivalTime: null,
    },
  ]

  const result = parseFlightSearchForm(values)

  assert.equal(result.success, false)
  assert.match(JSON.stringify(result.error?.issues), /Return date must be on or after departure date/)
})

test("flightSearchFormSchema enforces multi-city slice limits", () => {
  const values = createDefaultFlightSearchValues()

  values.journeyType = "multi_city"
  values.slices = Array.from({ length: 7 }, (_, index) => ({
    origin: place(`A${index}A`, `Airport ${index}`),
    destination: place(`B${index}B`, `Airport ${index + 1}`),
    departureDate: `2026-10-${String(index + 10).padStart(2, "0")}`,
    departureTime: null,
    arrivalTime: null,
  }))

  const result = parseFlightSearchForm(values)

  assert.equal(result.success, false)
})

test("flightSearchFormSchema rejects inverted time ranges", () => {
  const values = createDefaultFlightSearchValues()

  values.slices[0] = {
    origin: place("CMB", "Colombo"),
    destination: place("SIN", "Singapore"),
    departureDate: "2026-07-01",
    departureTime: {
      from: "18:00",
      to: "07:00",
    },
    arrivalTime: null,
  }

  const result = parseFlightSearchForm(values)

  assert.equal(result.success, false)
  assert.match(JSON.stringify(result.error?.issues), /Invalid time range/)
})
