import "server-only"
import { getDbClient } from "@/lib/db/client"
export type VisaDatabase = NonNullable<ReturnType<typeof getDbClient>>
export type VisaTransaction = Parameters<
  Parameters<VisaDatabase["transaction"]>[0]
>[0]
export type VisaExecutor = VisaDatabase | VisaTransaction
export function requireDb(): VisaDatabase {
  const db = getDbClient()
  if (!db) throw new Error("Database is not configured.")
  return db
}
