import { expect, test } from "vitest"

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

  expect(result.success).toBe(true)
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

  expect(result.success).toBe(false)
  expect(JSON.stringify(result.error?.issues)).toMatch(
    /Return date must be on or after departure date/
  )
})

test("flightSearchFormSchema accepts return trips when inbound endpoints are implicit", () => {
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
      origin: null,
      destination: null,
      departureDate: "2026-09-12",
      departureTime: null,
      arrivalTime: null,
    },
  ]

  const result = parseFlightSearchForm(values)

  expect(result.success).toBe(true)
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

  expect(result.success).toBe(false)
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

  expect(result.success).toBe(false)
  expect(JSON.stringify(result.error?.issues)).toMatch(/Invalid time range/)
})

test("flightSearchFormSchema requires child ages for each child passenger", () => {
  const values = createDefaultFlightSearchValues()

  values.passengers = {
    adults: 1,
    children: 2,
    childrenAges: [7],
  }
  values.slices[0] = {
    origin: place("CMB", "Colombo"),
    destination: place("DXB", "Dubai"),
    departureDate: "2026-08-12",
    departureTime: null,
    arrivalTime: null,
  }

  const result = parseFlightSearchForm(values)

  expect(result.success).toBe(false)
  expect(JSON.stringify(result.error?.issues)).toMatch(
    /Provide an age for each child passenger/
  )
})
