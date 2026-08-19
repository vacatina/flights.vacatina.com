import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import type { PaymentInternalOrderType } from "@/modules/payments/domain"
import type { PayableResourceAdapter } from "@/modules/payments/server/adapters"
import {
  registerPaymentAdapter,
  resetPaymentAdaptersForTests,
} from "@/modules/payments/server/adapters"
import {
  defaultPaymentAttemptsRepository,
  resetInMemoryPaymentAttemptsForTests,
} from "@/modules/payments/server/attempts-repository"
import {
  defaultPaymentEventsRepository,
  resetInMemoryPaymentEventsForTests,
} from "@/modules/payments/server/events-repository"
import {
  defaultPaymentOutboxRepository,
  resetInMemoryPaymentOutboxForTests,
} from "@/modules/payments/server/outbox-repository"
import { processPaymentOutboxByPaymentAttemptId } from "@/modules/payments/server/workers/outbox-worker"

const CASES = 200

beforeEach(() => {
  delete process.env.DATABASE_URL
  process.env.PAYMENTS_OUTBOX_MAX_ATTEMPTS = "5"
  resetPaymentAdaptersForTests()
  resetInMemoryPaymentAttemptsForTests()
  resetInMemoryPaymentEventsForTests()
  resetInMemoryPaymentOutboxForTests()
})

describe("payment flow stress test", () => {
  test("runs deterministic checkout and flight-change capture/fulfillment scenarios", async () => {
    const failuresBeforeSuccess = new Map<string, number>()
    const fulfillmentCalls = new Map<string, number>()
    registerPaymentAdapter(createAdapter("flight_checkout", failuresBeforeSuccess, fulfillmentCalls))
    registerPaymentAdapter(createAdapter("flight_change", failuresBeforeSuccess, fulfillmentCalls))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)

    const stats = {
      checkout: 0,
      flightChange: 0,
      expectedSuccess: 0,
      expectedTerminalFailure: 0,
      fulfilled: 0,
      terminalFailures: 0,
      retries: 0,
      duplicatesPrevented: 0,
      invariantFailures: 0,
    }

    try {
      for (let index = 0; index < CASES; index += 1) {
        const paymentAttemptId = `pat_stress_${index}`
        const internalOrderType: PaymentInternalOrderType =
          index % 2 === 0 ? "flight_checkout" : "flight_change"
        const failures = scenarioFailures(index)
        failuresBeforeSuccess.set(paymentAttemptId, failures)
        internalOrderType === "flight_checkout" ? (stats.checkout += 1) : (stats.flightChange += 1)
        failures >= 5 ? (stats.expectedTerminalFailure += 1) : (stats.expectedSuccess += 1)

        await defaultPaymentAttemptsRepository.createOrFindByIdempotency({
          id: paymentAttemptId,
          internalOrderType,
          internalOrderId: `${internalOrderType}_${index}`,
          ownerUserId: "stress-user",
          ownerGuestId: null,
          ownerOrgId: null,
          provider: "paypal",
          status: "capture_completed",
          currency: "USD",
          amount: 100 + index,
          providerOrderId: `PAYPAL-ORDER-${index}`,
          providerCaptureId: `PAYPAL-CAPTURE-${index}`,
          providerStatus: "COMPLETED",
          createIdempotencyKey: `create_${index}`,
          captureIdempotencyKey: `capture_${index}`,
          clientIdempotencyKey: `client_${index}`,
        })

        const task = await defaultPaymentOutboxRepository.enqueueUnique({
          id: `pob_stress_${index}`,
          taskType: "fulfill_paid_resource",
          uniqueKey: `fulfill_paid_resource:${paymentAttemptId}`,
          paymentAttemptId,
          internalOrderType,
          internalOrderId: `${internalOrderType}_${index}`,
        })
        const duplicate = await defaultPaymentOutboxRepository.enqueueUnique({
          id: `pob_stress_duplicate_${index}`,
          taskType: "fulfill_paid_resource",
          uniqueKey: `fulfill_paid_resource:${paymentAttemptId}`,
          paymentAttemptId,
          internalOrderType,
          internalOrderId: `${internalOrderType}_${index}`,
        })
        if (duplicate.id === task.id) stats.duplicatesPrevented += 1

        for (let run = 0; run < 5; run += 1) {
          try {
            await processPaymentOutboxByPaymentAttemptId({
              paymentAttemptId,
              workerId: `stress-worker-${run}`,
              now: new Date(Date.now() + 24 * 60 * 60 * 1000),
            })
          } catch {
            // A failed attempt is expected in retry and terminal-failure scenarios.
          }

          const current = await defaultPaymentOutboxRepository.findByUniqueKey(task.uniqueKey)
          if (!current || current.status === "completed" || current.status === "failed") {
            if (current?.status === "completed") stats.fulfilled += 1
            if (current?.status === "failed") stats.terminalFailures += 1
            stats.retries += current?.attemptCount ?? 0
            break
          }
        }

        const current = await defaultPaymentOutboxRepository.findByUniqueKey(task.uniqueKey)
        const calls = fulfillmentCalls.get(paymentAttemptId) ?? 0
        if (!current || (current.status !== "completed" && current.status !== "failed") || calls > 5) {
          stats.invariantFailures += 1
        }
      }
    } finally {
      consoleError.mockRestore()
    }

    console.info("\nPayment stress test — deterministic local mock data")
    console.info(`Cases: ${CASES} | checkout: ${stats.checkout} | flight changes: ${stats.flightChange}`)
    console.info(`Expected success: ${stats.expectedSuccess} | actual success: ${stats.fulfilled}`)
    console.info(`Expected terminal failure: ${stats.expectedTerminalFailure} | actual terminal failure: ${stats.terminalFailures}`)
    console.info(`Outbox retries: ${stats.retries} | duplicate enqueues prevented: ${stats.duplicatesPrevented}`)
    console.info(`Invariant failures: ${stats.invariantFailures} | max attempts: 5`)

    expect(stats).toMatchObject({
      expectedSuccess: 160,
      expectedTerminalFailure: 40,
      fulfilled: 160,
      terminalFailures: 40,
      duplicatesPrevented: CASES,
      invariantFailures: 0,
    })
    expect(stats.retries).toBe(260)
  })
})

function scenarioFailures(index: number) {
  // 60% immediate success, 20% recover after one/two retries, 20% terminal failure.
  const position = index % 10
  if (position < 6) return 0
  if (position === 6) return 1
  if (position === 7) return 2
  return 5
}

function createAdapter(
  resourceType: "flight_checkout" | "flight_change",
  failuresBeforeSuccess: Map<string, number>,
  fulfillmentCalls: Map<string, number>
): PayableResourceAdapter {
  return {
    resourceType,
    async fulfill(input) {
      const calls = (fulfillmentCalls.get(input.paymentAttemptId) ?? 0) + 1
      fulfillmentCalls.set(input.paymentAttemptId, calls)
      if (calls <= (failuresBeforeSuccess.get(input.paymentAttemptId) ?? 0)) {
        throw new Error(`Mock ${resourceType} fulfillment outage`)
      }
      return { status: "fulfilled", externalOrderId: `confirmed_${input.internalOrderId}` }
    },
  }
}
