import "server-only"

import { getDbClient } from "@/lib/db/client"

export function catalogDatabase() {
  const db = getDbClient()
  if (!db) throw new Error("Database is not configured")
  return db
}

export type CatalogTransaction = Parameters<
  Parameters<ReturnType<typeof catalogDatabase>["transaction"]>[0]
>[0]

export class CatalogError extends Error {
  constructor(
    message: string,
    readonly field?: string
  ) {
    super(message)
    this.name = "CatalogError"
  }
}

export function catalogWriteError(error: unknown): never {
  const databaseError = error as { code?: string; cause?: { code?: string } }
  if (
    databaseError?.code === "23505" ||
    databaseError?.cause?.code === "23505"
  ) {
    throw new CatalogError(
      "This passport, destination, and visa code already exists. Choose a different code.",
      "code"
    )
  }
  throw error
}
