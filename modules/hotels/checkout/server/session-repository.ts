import "server-only"

export interface HotelCheckoutSessionRecord {
  id: string
  rateId: string
  hotelId: string
  roomId: string
  checkin: string
  checkout: string
  guests: any[]
  netAmount: number
  sellAmount: number
  currency: string
  primaryGuestName?: string
  primaryGuestEmail?: string
  status: "processing" | "completed" | "failed"
}

// For the base infrastructure, we implement an in-memory repository.
// In a full implementation, you would map this to a `hotel_checkout_sessions` DB table.
const inMemoryHotelSessions = new Map<string, HotelCheckoutSessionRecord>()

export const hotelCheckoutSessionRepository = {
  async create(input: Omit<HotelCheckoutSessionRecord, "id" | "status">): Promise<HotelCheckoutSessionRecord> {
    const id = `hcs_${Math.random().toString(36).substring(7)}`
    const record: HotelCheckoutSessionRecord = {
      ...input,
      id,
      status: "processing",
    }
    inMemoryHotelSessions.set(id, record)
    return record
  },
  
  async findById(id: string): Promise<HotelCheckoutSessionRecord | null> {
    return inMemoryHotelSessions.get(id) || null
  },
  
  async update(id: string, updates: Partial<HotelCheckoutSessionRecord>): Promise<HotelCheckoutSessionRecord | null> {
    const existing = inMemoryHotelSessions.get(id)
    if (!existing) return null
    
    const updated = { ...existing, ...updates }
    inMemoryHotelSessions.set(id, updated)
    return updated
  }
}
