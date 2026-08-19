import { z } from "zod"

export const hotelSearchFormSchema = z.object({
  destinationId: z.string().min(1, "Destination is required"),
  destinationName: z.string().min(1, "Destination name is required"),
  checkInDate: z.string().min(1, "Check-in date is required"),
  checkOutDate: z.string().min(1, "Check-out date is required"),
  guests: z.object({
    adults: z.number().min(1).max(9),
    children: z.number().min(0).max(9),
    childrenAges: z.array(z.number()).optional(),
  }),
  rooms: z.number().min(1).max(9).default(1),
})

export type HotelSearchFormValues = z.infer<typeof hotelSearchFormSchema>

export interface HotelSearchCommand {
  cityId?: string
  hotelIds?: string[]
  checkin: string
  checkout: string
  adults: number
  children: number
  guestNationality: string
  currency: string
  sessionId?: string
  clientIp?: string
}

export function toHotelSearchCommand(
  values: HotelSearchFormValues
): HotelSearchCommand {
  return {
    cityId: values.destinationId, // Assuming destination ID is a city ID from LiteAPI
    checkin: values.checkInDate,
    checkout: values.checkOutDate,
    adults: values.guests.adults,
    children: values.guests.children,
    guestNationality: "US", // Defaulting for now
    currency: "USD",
  }
}

export function parseHotelSearchInput(input: unknown) {
  return hotelSearchFormSchema.safeParse(input)
}
