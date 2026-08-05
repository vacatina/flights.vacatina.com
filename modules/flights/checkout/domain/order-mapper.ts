import type { CreateOrderPassenger, Offer } from "@duffel/api/types"

import type {
  CheckoutContactInput,
  CheckoutPassengerInput,
} from "@/modules/flights/checkout/domain/types"

export function mapPassengersToCreateOrderPassengers(input: {
  offer: Offer
  passengers: CheckoutPassengerInput[]
  contact: CheckoutContactInput
}): CreateOrderPassenger[] {
  const byId = new Map(input.passengers.map((passenger) => [passenger.id, passenger]))
  const mapped: CreateOrderPassenger[] = []
  const adultIndexes: number[] = []
  const infantPassengerIds: string[] = []

  for (const offerPassenger of input.offer.passengers) {
    const formPassenger = byId.get(offerPassenger.id)

    if (!formPassenger) {
      throw new Error("Passenger details are incomplete. Please review the form.")
    }

    validatePassengerTypeMatch(formPassenger, offerPassenger.type)
    validatePassengerBornOnMatchesType({
      passenger: formPassenger,
      offer: input.offer,
      offerType: offerPassenger.type,
    })

    const passenger: CreateOrderPassenger = {
      id: formPassenger.id,
      title: formPassenger.title,
      given_name: formPassenger.givenName.trim(),
      family_name: formPassenger.familyName.trim(),
      gender: formPassenger.gender,
      born_on: formPassenger.bornOn,
      email: (formPassenger.email ?? input.contact.email).trim(),
      phone_number: (formPassenger.phoneNumber ?? input.contact.phoneNumber).trim(),
    }

    if (formPassenger.identityDocument) {
      passenger.identity_documents = [
        {
          // Duffel's API supports every type advertised by the offer, but the SDK's
          // CreateOrderPassenger type still only lists passport and tax_id.
          type: formPassenger.identityDocument
            .type as NonNullable<CreateOrderPassenger["identity_documents"]>[number]["type"],
          unique_identifier: formPassenger.identityDocument.uniqueIdentifier.trim(),
          issuing_country_code:
            formPassenger.identityDocument.issuingCountryCode.trim().toUpperCase(),
          expires_on: formPassenger.identityDocument.expiresOn,
        },
      ]
    }

    if (offerPassenger.type === "adult") {
      adultIndexes.push(mapped.length)
    } else if (offerPassenger.type === "infant_without_seat") {
      infantPassengerIds.push(offerPassenger.id)
    }

    mapped.push(passenger)
  }

  if (infantPassengerIds.length > adultIndexes.length) {
    throw new Error(
      "Each infant must be associated with a unique adult passenger. Please update passengers."
    )
  }

  for (let index = 0; index < infantPassengerIds.length; index += 1) {
    const adultIndex = adultIndexes[index]

    if (adultIndex === undefined) {
      break
    }

    mapped[adultIndex] = {
      ...mapped[adultIndex],
      infant_passenger_id: infantPassengerIds[index],
    }
  }

  return mapped
}

export function validateIdentityDocumentRequirements(input: {
  offer: Offer
  passengers: CheckoutPassengerInput[]
}) {
  const supportedTypes = new Set(input.offer.supported_passenger_identity_document_types)

  for (const passenger of input.passengers) {
    const doc = passenger.identityDocument

    if (input.offer.passenger_identity_documents_required && !doc) {
      throw new Error("Identity document is required for all passengers.")
    }

    if (!doc) {
      continue
    }

    if (!supportedTypes.has(doc.type)) {
      throw new Error("Selected identity document type is not supported for this offer.")
    }
  }
}

function validatePassengerTypeMatch(
  formPassenger: CheckoutPassengerInput,
  offerType: Offer["passengers"][number]["type"]
) {
  if (formPassenger.type === offerType) {
    return
  }

  throw new Error("Passenger type mismatch detected. Please refresh checkout.")
}

function validatePassengerBornOnMatchesType(input: {
  passenger: CheckoutPassengerInput
  offer: Offer
  offerType: Offer["passengers"][number]["type"]
}) {
  const lastDeparture = getLastDepartureDate(input.offer)
  const bornOn = parseDateOnly(input.passenger.bornOn)

  if (!lastDeparture || !bornOn) {
    return
  }

  const age = ageOnDate(bornOn, lastDeparture)

  if (input.offerType === "adult" && age >= 18) {
    return
  }

  if (input.offerType === "child" && age >= 2 && age < 18) {
    return
  }

  if (input.offerType === "infant_without_seat" && age >= 0 && age < 2) {
    return
  }

  throw new Error(
    "Passenger date of birth does not match the passenger type selected for this fare."
  )
}

function getLastDepartureDate(offer: Offer) {
  const departures: Date[] = []

  for (const slice of offer.slices ?? []) {
    for (const segment of slice.segments ?? []) {
      const departingAt = parseDateTime(String(segment.departing_at ?? ""))

      if (departingAt) {
        departures.push(departingAt)
      }
    }
  }

  if (departures.length === 0) {
    return null
  }

  return departures.reduce((latest, current) =>
    current.getTime() > latest.getTime() ? current : latest
  )
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, monthIndex, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function parseDateTime(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function ageOnDate(bornOn: Date, referenceDate: Date) {
  let age = referenceDate.getUTCFullYear() - bornOn.getUTCFullYear()
  const monthDelta = referenceDate.getUTCMonth() - bornOn.getUTCMonth()
  const dayDelta = referenceDate.getUTCDate() - bornOn.getUTCDate()

  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1
  }

  return age
}
