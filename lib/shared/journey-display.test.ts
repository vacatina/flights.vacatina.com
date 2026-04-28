import { expect, test } from "vitest"

import {
  buildJourneyRouteSummary,
  getJourneyLegTitle,
  getJourneyTypeLabelFromSlices,
  inferJourneyTypeFromSlices,
} from "@/lib/shared/journey-display"

test("inferJourneyTypeFromSlices returns return for mirrored 2-leg routes", () => {
  const journeyType = inferJourneyTypeFromSlices([
    { originIataCode: "CMB", destinationIataCode: "DXB" },
    { originIataCode: "DXB", destinationIataCode: "CMB" },
  ])

  expect(journeyType).toBe("return")
  expect(getJourneyTypeLabelFromSlices([
    { originIataCode: "CMB", destinationIataCode: "DXB" },
    { originIataCode: "DXB", destinationIataCode: "CMB" },
  ])).toBe("Return")
})

test("inferJourneyTypeFromSlices returns multi_city for non-mirrored routes", () => {
  const twoLegOpenJaw = inferJourneyTypeFromSlices([
    { originIataCode: "CMB", destinationIataCode: "DXB" },
    { originIataCode: "DXB", destinationIataCode: "SFO" },
  ])
  const threeLeg = inferJourneyTypeFromSlices([
    { originIataCode: "CMB", destinationIataCode: "DXB" },
    { originIataCode: "DXB", destinationIataCode: "LHR" },
    { originIataCode: "LHR", destinationIataCode: "JFK" },
  ])

  expect(twoLegOpenJaw).toBe("multi_city")
  expect(threeLeg).toBe("multi_city")
})

test("buildJourneyRouteSummary keeps concise route for one-way/return and expanded summary for multi-city", () => {
  expect(
    buildJourneyRouteSummary([
      { originIataCode: "CMB", destinationIataCode: "DXB" },
    ])
  ).toBe("CMB ⇄ DXB")

  expect(
    buildJourneyRouteSummary([
      { originIataCode: "CMB", destinationIataCode: "DXB" },
      { originIataCode: "DXB", destinationIataCode: "CMB" },
    ])
  ).toBe("CMB ⇄ DXB")

  expect(
    buildJourneyRouteSummary([
      { originIataCode: "CMB", destinationIataCode: "DXB" },
      { originIataCode: "DXB", destinationIataCode: "LHR" },
      { originIataCode: "LHR", destinationIataCode: "SFO" },
    ])
  ).toBe("CMB → SFO · 3 legs")
})

test("getJourneyLegTitle preserves outbound/inbound only for return trips", () => {
  expect(
    getJourneyLegTitle({
      journeyType: "return",
      legIndex: 0,
      totalLegs: 2,
      singleLegTitle: "Flight",
    })
  ).toBe("Outbound")
  expect(
    getJourneyLegTitle({
      journeyType: "return",
      legIndex: 1,
      totalLegs: 2,
      singleLegTitle: "Flight",
    })
  ).toBe("Inbound")

  expect(
    getJourneyLegTitle({
      journeyType: "multi_city",
      legIndex: 0,
      totalLegs: 3,
      singleLegTitle: "Flight",
    })
  ).toBe("Leg 1")
})
