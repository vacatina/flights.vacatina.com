import { beforeEach, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/logging/flow-debug", () => ({
  logFlightFlow: vi.fn(),
  logFlightFlowError: vi.fn(),
}))

import {
  getDisplayFxSnapshot,
  parseProviderPayload,
  refreshRates,
  type FxServiceDeps,
} from "@/modules/currency/server/fx-service"
import { CURRENCY_REGISTRY } from "@/modules/currency/domain"
import type {
  FxRateSnapshotRecord,
  FxRateSnapshotRepository,
} from "@/modules/currency/server/fx-rate-repository"

const now = new Date("2026-07-30T12:00:00.000Z")
const completeRates = Object.fromEntries(
  CURRENCY_REGISTRY.map((currency) => [
    currency.code,
    { amount: "1000000000000", scale: 12 },
  ])
)

function createRecord(
  overrides: Partial<FxRateSnapshotRecord> = {}
): FxRateSnapshotRecord {
  return {
    id: "open_exchange_rates:USD",
    provider: "open_exchange_rates",
    baseCurrency: "USD",
    rates: completeRates,
    providerUpdatedAt: new Date("2026-07-30T10:00:00.000Z"),
    fetchedAt: new Date("2026-07-30T10:00:00.000Z"),
    freshUntil: new Date("2026-07-30T16:00:00.000Z"),
    staleUntil: new Date("2026-08-06T10:00:00.000Z"),
    refreshLeaseUntil: null,
    lastError: null,
    updatedAt: new Date("2026-07-30T10:00:00.000Z"),
    ...overrides,
  }
}

function createDeps(record: FxRateSnapshotRecord | null) {
  const repository: FxRateSnapshotRepository = {
    find: vi.fn().mockResolvedValue(record),
    claimRefreshLease: vi.fn().mockResolvedValue(false),
    save: vi.fn(),
    releaseRefreshLease: vi.fn(),
  }
  const deps: FxServiceDeps = {
    repository,
    now: () => now,
    fetchRates: vi.fn(),
  }
  return { deps, repository }
}

beforeEach(() => {
  vi.clearAllMocks()
})

test("returns a fresh cached snapshot without scheduling refresh", async () => {
  const { deps } = createDeps(createRecord())
  const scheduleRefresh = vi.fn()

  const result = await getDisplayFxSnapshot({ scheduleRefresh }, deps)

  expect(result?.stale).toBe(false)
  expect(scheduleRefresh).not.toHaveBeenCalled()
})

test("serves stale data and schedules one refresh", async () => {
  const { deps } = createDeps(
    createRecord({
      freshUntil: new Date("2026-07-30T11:00:00.000Z"),
    })
  )
  const scheduleRefresh = vi.fn()

  const result = await getDisplayFxSnapshot({ scheduleRefresh }, deps)

  expect(result?.stale).toBe(true)
  expect(scheduleRefresh).toHaveBeenCalledTimes(1)
})

test("rejects provider payloads missing a display currency", () => {
  expect(() =>
    parseProviderPayload({
      base: "USD",
      timestamp: 1_785_412_800,
      rates: { USD: 1, LKR: 300 },
    })
  ).toThrow(/missing/i)
})

test("blocks on an empty cache and stores a valid provider response", async () => {
  const { deps, repository } = createDeps(null)
  const saved = createRecord()
  vi.mocked(repository.claimRefreshLease).mockResolvedValue(true)
  vi.mocked(deps.fetchRates).mockResolvedValue({
    rates: completeRates,
    providerUpdatedAt: new Date("2026-07-30T11:00:00.000Z"),
  })
  vi.mocked(repository.save).mockResolvedValue(saved)

  const result = await getDisplayFxSnapshot({}, deps)

  expect(result?.rates).toEqual(completeRates)
  expect(repository.save).toHaveBeenCalledTimes(1)
})

test("does not serve an expired snapshot when another refresh owns the lease", async () => {
  const { deps } = createDeps(
    createRecord({
      freshUntil: new Date("2026-07-29T12:00:00.000Z"),
      staleUntil: new Date("2026-07-30T11:59:59.000Z"),
    })
  )

  await expect(getDisplayFxSnapshot({}, deps)).resolves.toBeNull()
})

test("preserves last-known-good data when a refresh fails", async () => {
  const cached = createRecord()
  const { deps, repository } = createDeps(cached)
  vi.mocked(repository.claimRefreshLease).mockResolvedValue(true)
  vi.mocked(deps.fetchRates).mockRejectedValue(new Error("timed out"))

  await expect(refreshRates(deps)).resolves.toBeNull()
  expect(repository.save).not.toHaveBeenCalled()
  expect(repository.releaseRefreshLease).toHaveBeenCalledWith("timed out")
  expect(await repository.find()).toBe(cached)
})

test("allows only one concurrent refresh lease winner", async () => {
  const repository: FxRateSnapshotRepository = {
    find: vi.fn().mockResolvedValue(null),
    claimRefreshLease: vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false),
    save: vi.fn().mockImplementation(async (record) =>
      createRecord({
        ...record,
        id: "open_exchange_rates:USD",
        refreshLeaseUntil: null,
        lastError: null,
        updatedAt: now,
      })
    ),
    releaseRefreshLease: vi.fn(),
  }
  const fetchRates = vi.fn().mockResolvedValue({
    rates: completeRates,
    providerUpdatedAt: now,
  })
  const deps: FxServiceDeps = { repository, now: () => now, fetchRates }

  const [winner, loser] = await Promise.all([
    refreshRates(deps),
    refreshRates(deps),
  ])

  expect(winner).not.toBeNull()
  expect(loser).toBeNull()
  expect(fetchRates).toHaveBeenCalledTimes(1)
  expect(repository.save).toHaveBeenCalledTimes(1)
})
