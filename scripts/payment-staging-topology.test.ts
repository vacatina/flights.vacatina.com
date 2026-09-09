import { describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { closeDbClientPool } from "@/lib/db"
import { defaultPaymentAttemptsRepository } from "@/modules/payments/server/attempts-repository"
import { publishPaymentFulfillmentTask } from "@/modules/payments/server/job-publisher"
import { defaultPaymentOutboxRepository } from "@/modules/payments/server/outbox-repository"

const CASES = 50
const POLL_INTERVAL_MS = 1_000
const TIMEOUT_MS = 30_000
const QSTASH_STRESS_RETRY = { retries: 4, retryDelay: "1000" }

describe("staging payment topology stress test", () => {
  test("delivers synthetic payment tasks through QStash to the deployed outbox worker", async () => {
    assertStagingConfiguration()
    const runId = `staging-stress-${Date.now()}`
    const stats = {
      created: 0,
      published: 0,
      deduplicated: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      publishProblems: new Map<string, number>(),
      retries: 0,
    }

    try {
      for (let index = 0; index < CASES; index += 1) {
        const paymentAttemptId = `${runId}-attempt-${index}`
        const failuresBeforeSuccess = scenarioFailures(index)
        const internalOrderId = `${runId}-${index % 2 === 0 ? "checkout" : "change"}-${index}`
        await defaultPaymentAttemptsRepository.createOrFindByIdempotency({
          id: paymentAttemptId,
          internalOrderType: "payment_stress_test",
          internalOrderId,
          ownerUserId: null,
          // This is infrastructure-only data, not a customer or guest payment.
          ownerGuestId: null,
          ownerOrgId: null,
          provider: "paypal",
          status: "capture_completed",
          currency: "USD",
          amount: 0.01,
          providerOrderId: `STRESS-ORDER-${runId}-${index}`,
          providerCaptureId: `STRESS-CAPTURE-${runId}-${index}`,
          providerStatus: "COMPLETED",
          createIdempotencyKey: `${runId}:create:${index}`,
          captureIdempotencyKey: `${runId}:capture:${index}`,
          clientIdempotencyKey: `${runId}:client:${index}`,
          checkoutPayloadSnapshot: { runId, synthetic: true, simulatedFlow: index % 2 === 0 ? "checkout" : "flight_change" },
        })
        await defaultPaymentOutboxRepository.enqueueUnique({
          id: `${runId}-outbox-${index}`,
          taskType: "fulfill_paid_resource",
          uniqueKey: `fulfill_paid_resource:${paymentAttemptId}`,
          paymentAttemptId,
          internalOrderType: "payment_stress_test",
          internalOrderId,
          payload: { runId, synthetic: true, failuresBeforeSuccess },
        })
        stats.created += 1
        console.info(`[${index + 1}/${CASES}] Created synthetic ${index % 2 === 0 ? "checkout" : "flight-change"} outbox task.`)

        const firstPublish = await publishPaymentFulfillmentTask({
          paymentAttemptId,
          checkoutSessionId: internalOrderId,
        })
        const duplicatePublish = await publishPaymentFulfillmentTask({
          paymentAttemptId,
          checkoutSessionId: internalOrderId,
        })
        if (firstPublish.published) stats.published += 1
        else addPublishProblem(stats.publishProblems, firstPublish.reason)
        if (duplicatePublish.published && duplicatePublish.deduplicated) stats.deduplicated += 1
        else if (!duplicatePublish.published) addPublishProblem(stats.publishProblems, duplicatePublish.reason)
        console.info(
          `[${index + 1}/${CASES}] QStash: ${describePublish(firstPublish)} | duplicate: ${describePublish(duplicatePublish)}`
        )
      }

      const deadline = Date.now() + TIMEOUT_MS
      while (Date.now() < deadline) {
        const tasks = await Promise.all(
          Array.from({ length: CASES }, (_, index) =>
            defaultPaymentOutboxRepository.findByUniqueKey(`fulfill_paid_resource:${runId}-attempt-${index}`)
          )
        )
        stats.completed = tasks.filter((task) => task?.status === "completed").length
        stats.pending = tasks.filter((task) => task?.status === "pending" || task?.status === "processing").length
        stats.failed = tasks.filter((task) => task?.status === "failed").length
        stats.retries = tasks.reduce((total, task) => total + (task?.attemptCount ?? 0), 0)
        console.info(`[delivery] completed: ${stats.completed}/${CASES} | pending: ${stats.pending} | failed: ${stats.failed}`)
        if (stats.completed + stats.failed === CASES) break
        await delay(POLL_INTERVAL_MS)
      }

      console.info("\nStaging payment topology test — QStash + deployed worker")
      console.info(`Run: ${runId} | synthetic tasks: ${stats.created}`)
      console.info(`QStash publishes: ${stats.published} | duplicate publishes deduplicated: ${stats.deduplicated}`)
      if (stats.publishProblems.size) {
        console.info(`Publish problems: ${formatPublishProblems(stats.publishProblems)}`)
      }
      console.info(`Outbox completed: ${stats.completed} | pending: ${stats.pending} | failed: ${stats.failed} | retries: ${stats.retries}`)
      console.info("No PayPal, Duffel, customer, booking, or flight-change data was used.")

      expect(stats).toMatchObject({ created: CASES, published: CASES, completed: 8, pending: 0, failed: 2, retries: 13 })
    } finally {
      await closeDbClientPool()
    }
  })
})

function assertStagingConfiguration() {
  const missing = ["DATABASE_URL", "QSTASH_TOKEN", "PAYMENTS_PUBLIC_BASE_URL", "PAYMENTS_JOB_SECRET"].filter(
    (name) => !process.env[name]?.trim()
  )
  if (process.env.PAYMENTS_STRESS_TARGET !== "staging" || process.env.PAYMENTS_STRESS_TEST_ENABLED !== "true" || missing.length) {
    throw new Error(
      `Staging stress test refused to run. Set PAYMENTS_STRESS_TARGET=staging, PAYMENTS_STRESS_TEST_ENABLED=true, and ${missing.join(", ") || "the required variables"}.`
    )
  }
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function addPublishProblem(problems: Map<string, number>, reason: string) {
  problems.set(reason, (problems.get(reason) ?? 0) + 1)
}

function formatPublishProblems(problems: Map<string, number>) {
  return Array.from(problems, ([reason, count]) => `${reason} (${count})`).join(", ")
}

function describePublish(result: Awaited<ReturnType<typeof publishPaymentFulfillmentTask>>) {
  if (!result.published) return `not published (${result.reason})`
  return result.deduplicated ? "published (deduplicated)" : "published"
}

function writePublishError(caseNumber: number, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const redacted = [process.env.QSTASH_TOKEN, process.env.PAYMENTS_JOB_SECRET]
    .filter((value): value is string => Boolean(value))
    .reduce((text, secret) => text.replaceAll(secret, "[redacted]"), message)
  process.stderr.write(`[${caseNumber}/${CASES}] QStash publish error: ${redacted}\n`)
}

function scenarioFailures(index: number) {
  const position = index % 10
  if (position < 6) return 0
  if (position === 6) return 1
  if (position === 7) return 2
  return 5
}
