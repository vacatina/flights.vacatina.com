import type { Config } from "drizzle-kit"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL for Drizzle configuration.")
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config
