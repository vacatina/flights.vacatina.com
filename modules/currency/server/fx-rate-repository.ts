import { and, eq, isNull, lt, or } from "drizzle-orm"

import { fxRateSnapshots, getDbClient } from "@/lib/db"
import type { SerializedFxRate } from "@/modules/currency/domain"

export interface FxRateSnapshotRecord {
  id: string
  provider: "open_exchange_rates"
  baseCurrency: "USD"
  rates: Record<string, SerializedFxRate>
  providerUpdatedAt: Date
  fetchedAt: Date
  freshUntil: Date
  staleUntil: Date
  refreshLeaseUntil: Date | null
  lastError: string | null
  updatedAt: Date
}

export interface FxRateSnapshotRepository {
  find(): Promise<FxRateSnapshotRecord | null>
  claimRefreshLease(now: Date, leaseUntil: Date): Promise<boolean>
  save(
    record: Omit<FxRateSnapshotRecord, "id" | "refreshLeaseUntil" | "lastError" | "updatedAt">
  ): Promise<FxRateSnapshotRecord>
  releaseRefreshLease(errorMessage?: string | null): Promise<void>
}

const SNAPSHOT_ID = "open_exchange_rates:USD"
let inMemorySnapshot: FxRateSnapshotRecord | null = null

export const defaultFxRateSnapshotRepository: FxRateSnapshotRepository = {
  async find() {
    const db = getDbClient()

    if (!db) {
      return inMemorySnapshot
    }

    const [row] = await db
      .select()
      .from(fxRateSnapshots)
      .where(eq(fxRateSnapshots.id, SNAPSHOT_ID))
      .limit(1)

    return row ? toRecord(row) : null
  },

  async claimRefreshLease(now, leaseUntil) {
    const db = getDbClient()

    if (!db) {
      if (
        inMemorySnapshot?.refreshLeaseUntil &&
        inMemorySnapshot.refreshLeaseUntil > now
      ) {
        return false
      }

      const fallback = inMemorySnapshot ?? createEmptyLeaseRecord(now)
      inMemorySnapshot = {
        ...fallback,
        refreshLeaseUntil: leaseUntil,
        updatedAt: now,
      }
      return true
    }

    const existing = await this.find()

    if (!existing) {
      const [inserted] = await db
        .insert(fxRateSnapshots)
        .values({
          id: SNAPSHOT_ID,
          provider: "open_exchange_rates",
          baseCurrency: "USD",
          rates: {},
          providerUpdatedAt: new Date(0),
          fetchedAt: new Date(0),
          freshUntil: new Date(0),
          staleUntil: new Date(0),
          refreshLeaseUntil: leaseUntil,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: fxRateSnapshots.id })

      if (inserted) {
        return true
      }
    }

    const claimed = await db
      .update(fxRateSnapshots)
      .set({
        refreshLeaseUntil: leaseUntil,
        updatedAt: now,
      })
      .where(
        and(
          eq(fxRateSnapshots.id, SNAPSHOT_ID),
          or(
            isNull(fxRateSnapshots.refreshLeaseUntil),
            lt(fxRateSnapshots.refreshLeaseUntil, now)
          )
        )
      )
      .returning({ id: fxRateSnapshots.id })

    return claimed.length > 0
  },

  async save(record) {
    const now = new Date()
    const values = {
      id: SNAPSHOT_ID,
      ...record,
      refreshLeaseUntil: null,
      lastError: null,
      updatedAt: now,
    }
    const db = getDbClient()

    if (!db) {
      inMemorySnapshot = values
      return values
    }

    const [row] = await db
      .insert(fxRateSnapshots)
      .values(values)
      .onConflictDoUpdate({
        target: fxRateSnapshots.id,
        set: values,
      })
      .returning()

    return toRecord(row)
  },

  async releaseRefreshLease(errorMessage = null) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      if (inMemorySnapshot) {
        inMemorySnapshot = {
          ...inMemorySnapshot,
          refreshLeaseUntil: null,
          lastError: errorMessage,
          updatedAt: now,
        }
      }
      return
    }

    await db
      .update(fxRateSnapshots)
      .set({
        refreshLeaseUntil: null,
        lastError: errorMessage,
        updatedAt: now,
      })
      .where(eq(fxRateSnapshots.id, SNAPSHOT_ID))
  },
}

function toRecord(
  row: typeof fxRateSnapshots.$inferSelect
): FxRateSnapshotRecord {
  return {
    id: row.id,
    provider: "open_exchange_rates",
    baseCurrency: "USD",
    rates: row.rates,
    providerUpdatedAt: row.providerUpdatedAt,
    fetchedAt: row.fetchedAt,
    freshUntil: row.freshUntil,
    staleUntil: row.staleUntil,
    refreshLeaseUntil: row.refreshLeaseUntil,
    lastError: row.lastError,
    updatedAt: row.updatedAt,
  }
}

function createEmptyLeaseRecord(now: Date): FxRateSnapshotRecord {
  return {
    id: SNAPSHOT_ID,
    provider: "open_exchange_rates",
    baseCurrency: "USD",
    rates: {},
    providerUpdatedAt: new Date(0),
    fetchedAt: new Date(0),
    freshUntil: new Date(0),
    staleUntil: new Date(0),
    refreshLeaseUntil: null,
    lastError: null,
    updatedAt: now,
  }
}

export function resetInMemoryFxRateRepositoryForTests() {
  inMemorySnapshot = null
}
