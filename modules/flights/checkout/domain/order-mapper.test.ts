import type { Offer } from "@duffel/api/types"
import { expect, test } from "vitest"

import { mapPassengersToCreateOrderPassengers } from "@/modules/flights/checkout/domain/order-mapper"
import type { CheckoutPassengerInput } from "@/modules/flights/checkout/domain/types"

const contact = {
  email: "guest@example.com",
  phoneNumber: "+94771234567",
}

test("mapPassengersToCreateOrderPassengers rejects adult date of birth for child fare", () => {
  expect(() =>
    mapPassengersToCreateOrderPassengers({
      offer: createOffer({ passengerType: "child" }),
      contact,
      passengers: [
        createPassenger({
          type: "child",
          bornOn: "1980-07-24",
        }),
      ],
    })
  ).toThrow(/date of birth does not match/)
})

test("mapPassengersToCreateOrderPassengers rejects child date of birth for adult fare", () => {
  expect(() =>
    mapPassengersToCreateOrderPassengers({
      offer: createOffer({ passengerType: "adult" }),
      contact,
      passengers: [
        createPassenger({
          type: "adult",
          bornOn: "2016-07-24",
        }),
      ],
    })
  ).toThrow(/date of birth does not match/)
})

test("mapPassengersToCreateOrderPassengers accepts matching passenger type and birth date", () => {
  const passengers = mapPassengersToCreateOrderPassengers({
    offer: createOffer({ passengerType: "child" }),
    contact,
    passengers: [
      createPassenger({
        type: "child",
        bornOn: "2016-07-24",
      }),
    ],
  })

  expect(passengers[0]?.born_on).toBe("2016-07-24")
})

test("mapPassengersToCreateOrderPassengers preserves supported traveler numbers", () => {
  const passenger = createPassenger({
    type: "adult",
    bornOn: "1980-07-24",
  })
  passenger.identityDocument = {
    type: "known_traveler_number",
    uniqueIdentifier: "123456789",
    issuingCountryCode: "US",
    expiresOn: "2030-07-24",
  }

  const passengers = mapPassengersToCreateOrderPassengers({
    offer: createOffer({ passengerType: "adult" }),
    contact,
    passengers: [passenger],
  })

  expect(passengers[0]?.identity_documents?.[0]).toMatchObject({
    type: "known_traveler_number",
    unique_identifier: "123456789",
  })
})

function createPassenger(input: {
  type: CheckoutPassengerInput["type"]
  bornOn: string
}): CheckoutPassengerInput {
  return {
    id: "pas_1",
    type: input.type,
    title: "mr",
    givenName: "Tony",
    familyName: "Stark",
    bornOn: input.bornOn,
    gender: "m",
    identityDocument: null,
  }
}

function createOffer(input: {
  passengerType: CheckoutPassengerInput["type"]
}) {
  return {
    slices: [
      {
        segments: [
          {
            departing_at: "2026-04-13T10:00:00.000Z",
          },
        ],
      },
    ],
    passengers: [{ id: "pas_1", type: input.passengerType }],
  } as unknown as Offer
}
