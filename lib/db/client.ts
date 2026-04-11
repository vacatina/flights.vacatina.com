import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "@/lib/db/schema"

type DbClient = NodePgDatabase<typeof schema>

let dbClient: DbClient | null | undefined
let pool: Pool | null = null

export function getDbClient(): DbClient | null {
  if (dbClient !== undefined) {
    return dbClient
  }

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    dbClient = null
    return null
  }

  const maxPoolSize = Number.parseInt(process.env.DB_POOL_MAX ?? "10", 10)
  const normalizedPoolSize =
    Number.isFinite(maxPoolSize) && maxPoolSize > 0 ? maxPoolSize : 10

  pool = new Pool({
    connectionString,
    max: normalizedPoolSize,
  })

  dbClient = drizzle(pool, { schema })
  return dbClient
}

export async function closeDbClientPool() {
  if (!pool) {
    return
  }

  await pool.end()
  pool = null
  dbClient = undefined
}
