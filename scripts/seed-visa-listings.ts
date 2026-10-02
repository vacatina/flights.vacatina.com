import { getDbClient, closeDbClientPool } from "../lib/db/client"
import { seedVisaListings } from "../modules/visa-assistance/catalog/seed/apply"
import {
  VISA_SEED_LISTINGS,
  SEED_NOTICE,
} from "../modules/visa-assistance/catalog/seed/listings"
import { createSeedRecord } from "../modules/visa-assistance/catalog/seed/records"

const apply = process.argv.includes("--apply")
if (process.env.NODE_ENV === "production") {
  throw new Error("Development visa seed cannot run with NODE_ENV=production.")
}
const records = VISA_SEED_LISTINGS.map((input) =>
  createSeedRecord(input, new Date())
)
console.log(SEED_NOTICE)
console.table(
  records.map(({ listing, documents }) => ({
    route: `${listing.nationalityCode} → ${listing.destinationCode}`,
    visa: listing.title,
    currency: listing.feeCurrency,
    priceMinor: listing.priceMinor,
    documents: documents.length,
  }))
)
if (!apply) {
  console.log("Dry run: no writes. Pass --apply --development to seed.")
} else {
  if (!process.argv.includes("--development")) {
    throw new Error("Confirm the development database with --development.")
  }
  try {
    const db = getDbClient()
    if (!db) throw new Error("DATABASE_URL is required.")
    console.table(await seedVisaListings(db))
  } finally {
    await closeDbClientPool()
  }
}
