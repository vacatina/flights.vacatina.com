import { test } from "node:test"
import assert from "node:assert/strict"

import { normalizePlaceSuggestion } from "@/modules/flights/search/server/place-normalizer"

const airportPlace = {
  type: "airport",
  time_zone: "Asia/Colombo",
  name: "Bandaranaike International",
  longitude: 79.884,
  latitude: 7.18,
  id: "arp_cmb_lk",
  icao_code: "VCBI",
  iata_country_code: "LK",
  iata_code: "CMB",
  iata_city_code: "CMB",
  city_name: "Colombo",
  country_name: "Sri Lanka",
  city: null,
  airports: null,
}

const cityPlace = {
  ...airportPlace,
  type: "city",
  id: "cit_dxb_ae",
  name: "Dubai",
  iata_code: "DXB",
  city_name: null,
}

test("normalizePlaceSuggestion maps airport data into UI option", () => {
  const result = normalizePlaceSuggestion(airportPlace)

  assert.deepEqual(result, {
    id: "arp_cmb_lk",
    type: "airport",
    iataCode: "CMB",
    iataCityCode: "CMB",
    name: "Bandaranaike International",
    cityName: "Colombo",
    countryCode: "LK",
    countryName: "Sri Lanka",
    displayName: "Colombo - Bandaranaike International (CMB)",
  })
})

test("normalizePlaceSuggestion maps city data into UI option", () => {
  const result = normalizePlaceSuggestion(cityPlace)

  assert.deepEqual(result, {
    id: "cit_dxb_ae",
    type: "city",
    iataCode: "DXB",
    iataCityCode: "CMB",
    name: "Dubai",
    cityName: null,
    countryCode: "LK",
    countryName: "Sri Lanka",
    displayName: "Dubai (DXB)",
  })
})

test("normalizePlaceSuggestion returns null for unsupported place types", () => {
  const result = normalizePlaceSuggestion({
    ...airportPlace,
    type: "train_station",
  } as never)

  assert.equal(result, null)
})
