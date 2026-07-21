import "server-only"

import { logFlightFlowError } from "@/lib/logging/flow-debug"
import type { PaymentEventType, PaymentOutboxTaskType } from "@/modules/payments/domain"
import {
  getPaymentAdapter,
  type PayableResourceAdapter,
} from "@/modules/payments/server/adapters"
import {
  defaultPaymentAttemptsRepository,
  type PaymentAttemptRecord,
  type PaymentAttemptsRepository,
} from "@/modules/payments/server/attempts-repository"
import {
  defaultPaymentEventsRepository,
  type PaymentEventsRepository,
} from "@/modules/payments/server/events-repository"
import { createPaymentEventId } from "@/modules/payments/server/ids"
import {
  defaultPaymentOutboxRepository,
  type PaymentOutboxRecord,
  type PaymentOutboxRepository,
} from "@/modules/payments/server/outbox-repository"

interface PaymentOutboxWorkerDeps {
  outboxRepository: PaymentOutboxRepository
  attemptsRepository: PaymentAttemptsRepository
  eventsRepository: PaymentEventsRepository
  getAdapter: (resourceType: string) => PayableResourceAdapter | null
}

const defaultDeps: PaymentOutboxWorkerDeps = {
  outboxRepository: defaultPaymentOutboxRepository,
  attemptsRepository: defaultPaymentAttemptsRepository,
  eventsRepository: defaultPaymentEventsRepository,
  getAdapter: getPaymentAdapter,
}

export async function processPaymentOutbox(input: {
  limit?: number
  now?: Date
  workerId?: string
  deps?: Partial<PaymentOutboxWorkerDeps>
} = {}) {
  const deps = { ...defaultDeps, ...input.deps }
  const now = input.now ?? new Date()
  const workerId = input.workerId ?? createPaymentWorkerId("outbox")
  const tasks = await deps.outboxRepository.findPending(now, input.limit ?? 10)
  let processed = 0
  let failed = 0
  let ignored = 0

  for (const task of tasks) {
    const claimNow = new Date()
    const claimedTask = await deps.outboxRepository.claimPending({
      id: task.id,
      workerId,
      now: claimNow,
      leaseExpiresAt: new Date(claimNow.getTime() + outboxLeaseMs()),
    })

    if (!claimedTask) {
      ignored += 1
      continue
    }

    try {
      if (!isFulfillmentTaskType(claimedTask.taskType)) {
        ignored += 1
        await deps.outboxRepository.markCompleted({
          id: claimedTask.id,
          workerId,
          now: new Date(),
        })
        continue
      }

      await processFulfillFlightOrderTask(claimedTask, deps)
      await deps.outboxRepository.markCompleted({
        id: claimedTask.id,
        workerId,
        now: new Date(),
      })
      processed += 1
    } catch (error) {
      failed += 1
      await deps.outboxRepository.markFailed({
        id: claimedTask.id,
        workerId,
        lastError: error instanceof Error ? error.message : "Unknown outbox worker error",
        nextAttemptAt: new Date(Date.now() + retryDelayMs(claimedTask.attemptCount + 1)),
      })
      logFlightFlowError("payments.outbox", "task_failed", error, {
        outboxId: claimedTask.id,
        taskType: claimedTask.taskType,
        paymentAttemptId: claimedTask.paymentAttemptId,
      })
    }
  }

  return {
    claimed: tasks.length,
    processed,
    failed,
    ignored,
  }
}

export async function processPaymentOutboxByPaymentAttemptId(input: {
  paymentAttemptId: string
  now?: Date
  workerId?: string
  deps?: Partial<PaymentOutboxWorkerDeps>
}) {
  const deps = { ...defaultDeps, ...input.deps }
  const workerId = input.workerId ?? createPaymentWorkerId("outbox-single")
  const task = await findFulfillmentTaskByPaymentAttemptId({
    paymentAttemptId: input.paymentAttemptId,
    outboxRepository: deps.outboxRepository,
  })

  if (!task) {
    throw new Error("Payment fulfillment outbox task not found.")
  }

  if (task.status === "completed") {
    return {
      claimed: 1,
      processed: 0,
      failed: 0,
      ignored: 1,
      alreadyCompleted: true,
    }
  }

  const claimNow = input.now ?? new Date()
  const claimedTask = await deps.outboxRepository.claimPending({
    id: task.id,
    workerId,
    now: claimNow,
    leaseExpiresAt: new Date(claimNow.getTime() + outboxLeaseMs()),
  })

  if (!claimedTask) {
    return {
      claimed: 0,
      processed: 0,
      failed: 0,
      ignored: 1,
      alreadyCompleted: false,
    }
  }

  try {
    if (!isFulfillmentTaskType(claimedTask.taskType)) {
      await deps.outboxRepository.markCompleted({
        id: claimedTask.id,
        workerId,
        now: new Date(),
      })
      return {
        claimed: 1,
        processed: 0,
        failed: 0,
        ignored: 1,
        alreadyCompleted: false,
      }
    }

    await processFulfillFlightOrderTask(claimedTask, deps)
    await deps.outboxRepository.markCompleted({
      id: claimedTask.id,
      workerId,
      now: new Date(),
    })
    return {
      claimed: 1,
      processed: 1,
      failed: 0,
      ignored: 0,
      alreadyCompleted: false,
    }
  } catch (error) {
    await deps.outboxRepository.markFailed({
      id: claimedTask.id,
      workerId,
      lastError: error instanceof Error ? error.message : "Unknown outbox worker error",
      nextAttemptAt: new Date(Date.now() + retryDelayMs(claimedTask.attemptCount + 1)),
    })
    logFlightFlowError("payments.outbox", "task_failed", error, {
      outboxId: claimedTask.id,
      taskType: claimedTask.taskType,
      paymentAttemptId: claimedTask.paymentAttemptId,
    })
    throw error
  }
}

async function processFulfillFlightOrderTask(
  task: PaymentOutboxRecord,
  deps: PaymentOutboxWorkerDeps
) {
  const attempt = await deps.attemptsRepository.findById(task.paymentAttemptId)

  if (!attempt) {
    throw new Error("Payment attempt not found for fulfillment task.")
  }

  if (attempt.status === "fulfilled") {
    return
  }

  if (
    attempt.status !== "capture_completed" &&
    attempt.status !== "fulfillment_pending" &&
    attempt.status !== "capture_pending" &&
    attempt.status !== "buyer_approved"
  ) {
    throw new Error(`Payment attempt cannot be fulfilled from ${attempt.status}.`)
  }

  await appendPaymentEventOnce({
    deps,
    attempt,
    eventType: "FULFILLMENT_REQUESTED",
  })
  await deps.attemptsRepository.update(attempt.id, {
    status: "fulfillment_pending",
  })

  try {
    const adapter = deps.getAdapter(task.internalOrderType)

    if (!adapter) {
      throw new Error(
        `No payment adapter registered for resource type ${task.internalOrderType}.`
      )
    }

    await adapter.fulfill({
      internalOrderId: task.internalOrderId,
      paymentAttemptId: attempt.id,
      provider: attempt.provider,
      providerPaymentId: attempt.providerCaptureId,
      now: new Date(),
    })
  } catch (error) {
    await appendPaymentEventOnce({
      deps,
      attempt,
      eventType: "FULFILLMENT_FAILED",
      metadata: {
        error: error instanceof Error ? error.message : "Unknown fulfillment error",
      },
    })
    throw error
  }

  await deps.attemptsRepository.update(attempt.id, {
    status: "fulfilled",
  })
  await appendPaymentEventOnce({
    deps,
    attempt,
    eventType: "FULFILLMENT_COMPLETED",
  })
}

async function appendPaymentEventOnce(input: {
  deps: Pick<PaymentOutboxWorkerDeps, "eventsRepository">
  attempt: PaymentAttemptRecord
  eventType: PaymentEventType
  metadata?: unknown
}) {
  const existing = await input.deps.eventsRepository.listByAttemptId(input.attempt.id)

  if (existing.some((event) => event.eventType === input.eventType)) {
    return
  }

  await input.deps.eventsRepository.append({
    id: createPaymentEventId(),
    paymentAttemptId: input.attempt.id,
    eventType: input.eventType,
    provider: input.attempt.provider,
    providerOrderId: input.attempt.providerOrderId,
    providerCaptureId: input.attempt.providerCaptureId,
    amount: input.attempt.amount,
    currency: input.attempt.currency,
    metadata: input.metadata,
  })
}

function retryDelayMs(attemptCount: number) {
  return Math.min(60_000 * 2 ** Math.max(attemptCount - 1, 0), 15 * 60_000)
}

async function findFulfillmentTaskByPaymentAttemptId(input: {
  paymentAttemptId: string
  outboxRepository: PaymentOutboxRepository
}) {
  return (
    (await input.outboxRepository.findByUniqueKey(
      `fulfill_paid_resource:${input.paymentAttemptId}`
    )) ??
    (await input.outboxRepository.findByUniqueKey(
      `fulfill_flight_order:${input.paymentAttemptId}`
    ))
  )
}

function isFulfillmentTaskType(taskType: PaymentOutboxTaskType) {
  return taskType === "fulfill_paid_resource" || taskType === "fulfill_flight_order"
}

function outboxLeaseMs() {
  return 5 * 60_000
}

function createPaymentWorkerId(scope: string) {
  return `payment-worker:${scope}:${Date.now()}:${Math.random().toString(36).slice(2)}`
}
