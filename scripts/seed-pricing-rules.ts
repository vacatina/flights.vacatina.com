import { randomUUID } from "node:crypto"

import { sql } from "drizzle-orm"

import { businessSettings, getDbClient, pricingRules } from "../lib/db"

async function main() {
  const db = getDbClient()

  if (!db) {
    throw new Error(
      "Missing DATABASE_URL. Cannot seed application defaults without a database."
    )
  }

  await seedPricingRules(db)
  await seedBusinessSettings(db)
}

async function seedPricingRules(
  db: NonNullable<ReturnType<typeof getDbClient>>
) {
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

async function seedBusinessSettings(
  db: NonNullable<ReturnType<typeof getDbClient>>
) {
  const [{ count }] = await db
    .select({
      count: sql<string>`count(*)`,
    })
    .from(businessSettings)

  const existingCount = Number(count)

  if (Number.isFinite(existingCount) && existingCount > 0) {
    console.log(
      `[business settings seed] skipped, existing settings: ${existingCount}`
    )
    return
  }

  await db.insert(businessSettings).values({
    id: "business_settings_default",
    businessName: process.env.BUSINESS_NAME?.trim() || "Vacatina Flights",
    supportEmail: process.env.SUPPORT_EMAIL?.trim() || "support@example.com",
    supportPhone: process.env.SUPPORT_PHONE?.trim() || "+10000000000",
    supportWhatsapp: process.env.SUPPORT_WHATSAPP?.trim() || "+10000000000",
    address: process.env.BUSINESS_ADDRESS?.trim() || "Business address pending",
    timezone: process.env.BUSINESS_TIMEZONE?.trim() || "UTC",
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  console.log("[business settings seed] inserted default business settings")
}

await main()
