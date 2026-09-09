import { z } from "zod"

export const hotelSearchFormSchema = z.object({
  placeId: z.string().min(3, "Please select a destination"),
  checkInDate: z.string().min(1, "Check-in date is required"),
  checkOutDate: z.string().min(1, "Check-out date is required"),
  guests: z.object({
    adults: z.number().min(1).max(9),
    children: z.number().min(0).max(9),
    childrenAges: z.array(z.number()),
  }),
  rooms: z.number().min(1).max(9),
}).refine(
  (data) => {
    if (!data.checkInDate || !data.checkOutDate) return true
    const checkin = new Date(data.checkInDate)
    const checkout = new Date(data.checkOutDate)
    return checkin < checkout
  },
  {
    message: "Check-out date must be after check-in date",
    path: ["checkOutDate"],
  }
)

export type HotelSearchFormValues = z.infer<typeof hotelSearchFormSchema>

export interface HotelRoomOccupancy {
  adults: number
  children?: number[] // Array of ages
}

export interface HotelSearchCommand {
  placeId: string
  checkin: string
  checkout: string
  occupancies: HotelRoomOccupancy[]
  guestNationality: string
  currency: string
  sessionId?: string
  clientIp?: string
  limit?: number
  offset?: number
  sortBy?: string
  priceMin?: number
  priceMax?: number
  stars?: number[]
}

export function toHotelSearchCommand(
  values: HotelSearchFormValues
): HotelSearchCommand {
  const totalGuests = values.guests.adults + values.guests.children
  const baseGuestsPerRoom = Math.floor(totalGuests / values.rooms)
  const remainderGuests = totalGuests % values.rooms

  const occupancies: HotelRoomOccupancy[] = []
  let childrenToDistribute = [...values.guests.childrenAges]

  for (let i = 0; i < values.rooms; i++) {
    const guestsInThisRoom = baseGuestsPerRoom + (i < remainderGuests ? 1 : 0)
    
    // We try to put adults first. If we run out of adults, we put children.
    // However, the LiteAPI expects adults count. For simplicity:
    const adultsInThisRoom = Math.min(values.guests.adults, guestsInThisRoom)
    const childrenInThisRoomCount = guestsInThisRoom - adultsInThisRoom
    
    const childrenForThisRoom = childrenToDistribute.splice(0, childrenInThisRoomCount)

    occupancies.push({
      adults: Math.max(1, adultsInThisRoom), // Need at least 1 adult per room normally
      children: childrenForThisRoom.length > 0 ? childrenForThisRoom : undefined,
    })
  }

  return {
    placeId: values.placeId,
    checkin: values.checkInDate,
    checkout: values.checkOutDate,
    occupancies,
    guestNationality: "LK", // Updated to Sri Lankan
    currency: "USD", // Keep USD for client-side DecimalMoney conversion
  }
}

export function parseHotelSearchInput(input: unknown) {
  return hotelSearchFormSchema.safeParse(input)
}
