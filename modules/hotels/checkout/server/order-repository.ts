import "server-only"
import { eq } from "drizzle-orm"
import { hotelOrders, getDbClient } from "@/lib/db"

export interface HotelOrderRecord {
  id: string
  bookingReference: string
  checkoutSessionId: string
  liteapiOrderId: string
  hotelId: string
  roomId: string
  selectedRates: string[]
  contactEmail: string
  contactEmailHash: string
  paymentMode: "pay_now" | "hold"
  netAmount: number
  sellAmount: number
  liteapiTotalAmount: number
  paymentAwaiting: boolean
  createdAt: Date
}

// Minimal repository for the hotel infrastructure phase
export const defaultHotelOrderRepository = {
  async create(input: any): Promise<HotelOrderRecord> {
    const db = getDbClient()
    if (!db) {
      throw new Error("Database client not available")
    }

    const [row] = await db.insert(hotelOrders).values({
      ...input,
      paymentAttemptId: input.paymentAttemptId ?? null,
      netAmount: input.netAmount.toString(),
      sellAmount: input.sellAmount.toString(),
      liteapiTotalAmount: input.liteapiTotalAmount.toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning()

    return row as unknown as HotelOrderRecord
  },
  
  async findByBookingReference(bookingReference: string): Promise<HotelOrderRecord | null> {
    const db = getDbClient()
    if (!db) return null
    const row = await db.query.hotelOrders.findFirst({
      where: eq(hotelOrders.bookingReference, bookingReference)
    })
    return row ? (row as unknown as HotelOrderRecord) : null
  }
}
