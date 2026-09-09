import "server-only"

import { sql } from "drizzle-orm"
import { unstable_cache } from "next/cache"

import { getDbClient } from "@/lib/db/client"
import { flightOrders } from "@/lib/db/schema"
import { destinations } from "@/modules/home/domain/destinations"

/** Only aggregate route codes leave the database. Never expose traveller data. */
const readPopularDestinations = unstable_cache(
  async () => {
    const db = getDbClient()

    if (!db || !process.env.DUFFEL_ACCESS_TOKEN?.startsWith("duffel_live_")) {
      return []
    }

    const destination = sql<string>`${flightOrders.orderSnapshot}->'legs'->0->>'arrivalIata'`
    const result = await db.execute<{ code: string }>(sql`
      SELECT ${destination} AS code
      FROM ${flightOrders}
      WHERE ${flightOrders.createdAt} >= NOW() - INTERVAL '30 days'
        AND ${flightOrders.paidAt} IS NOT NULL
        AND ${flightOrders.orderSnapshot}->'legs'->0->>'departureIata' = 'CMB'
        AND ${destination} IN ('DXB', 'LHR', 'SIN', 'BKK')
      GROUP BY ${destination}
      HAVING COUNT(*) >= 3
      ORDER BY COUNT(*) DESC, ${destination} ASC
      LIMIT 4
    `)

    return result.rows.map((row) => row.code)
  },
  ["homepage-popular-destinations-v1"],
  { revalidate: 3600 }
)

export async function getPopularDestinations() {
  try {
    const codes = await readPopularDestinations()

    if (codes.length === 4) {
      return {
        popular: true,
        destinations: codes.flatMap((code) =>
          destinations.filter((item) => item.code === code)
        ),
      }
    }
  } catch {
    console.warn(
      "[home/popular-destinations] Route ranking unavailable; showing editorial selection."
    )
  }

  return { popular: false, destinations: [...destinations] }
}
