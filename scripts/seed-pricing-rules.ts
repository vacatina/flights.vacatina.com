import { randomUUID } from "node:crypto"

import { sql } from "drizzle-orm"

import { getDbClient, pricingRules } from "../lib/db"

async function main() {
  const db = getDbClient()

  if (!db) {
    throw new Error(
      "Missing DATABASE_URL. Cannot seed pricing rules without a database."
    )
  }

  const [{ count }] = await db
    .select({
      count: sql<string>`count(*)`,
    })
    .from(pricingRules)

  const existingCount = Number(count)

  if (Number.isFinite(existingCount) && existingCount > 0) {
    console.log(
      `[pricing seed] skipped, existing pricing rules: ${existingCount}`
    )
    return
  }

  await db.insert(pricingRules).values({
    id: `prr_${randomUUID().replaceAll("-", "")}`,
    name: "Global default passthrough",
    enabled: true,
    priority: 0,
    adjustmentType: "percent",
    adjustmentValue: "10.0000",
    activeFrom: null,
    activeTo: null,
    journeyType: null,
    originIata: null,
    destinationIata: null,
    airlineIata: null,
    cabinClass: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  console.log("[pricing seed] inserted default pricing rule")
}

await main()
