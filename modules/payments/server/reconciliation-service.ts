import "server-only"

import { logFlightFlowError } from "@/lib/logging/flow-debug"
import type { PaymentAttemptRecord } from "@/modules/payments/server/attempts-repository"
import {
  defaultPaymentAttemptsRepository,
  type PaymentAttemptsRepository,
} from "@/modules/payments/server/attempts-repository"
import {
  defaultPaymentEventsRepository,
  type PaymentEventsRepository,
} from "@/modules/payments/server/events-repository"
import { createPaymentEventId, createPaymentOutboxId } from "@/modules/payments/server/ids"
import {
  defaultPaymentOutboxRepository,
  type PaymentOutboxRepository,
} from "@/modules/payments/server/outbox-repository"
import {
  getPayPalCaptureFromOrder,
  getPayPalOrder,
  mapPayPalCaptureStatusToAttemptStatus,
  type PayPalOrder,
} from "@/modules/payments/server/providers/paypal"

interface ReconciliationDeps {
  attemptsRepository: PaymentAttemptsRepository
  eventsRepository: PaymentEventsRepository
  outboxRepository: PaymentOutboxRepository
  getProviderOrder: (orderId: string) => Promise<PayPalOrder>
}

const defaultDeps: ReconciliationDeps = {
  attemptsRepository: defaultPaymentAttemptsRepository,
  eventsRepository: defaultPaymentEventsRepository,
  outboxRepository: defaultPaymentOutboxRepository,
  getProviderOrder: getPayPalOrder,
}

export async function reconcilePaymentAttempts(input: {
  limit?: number
  now?: Date
  deps?: Partial<ReconciliationDeps>
} = {}) {
  const deps = { ...defaultDeps, ...input.deps }
  const now = input.now ?? new Date()
  const attempts = await deps.attemptsRepository.findReconciliationCandidates({
    now,
    limit: input.limit ?? 10,
  })
  let checked = 0
  let repaired = 0
  let failed = 0

  for (const attempt of attempts) {
    checked += 1

    try {
      const result = await reconcilePaymentAttempt({ attempt, deps, now })

      if (result === "repaired") {
        repaired += 1
      }
    } catch (error) {
      failed += 1
      await deps.attemptsRepository.update(attempt.id, {
        status: "reconciliation_required",
        failureCode: "reconciliation_failed",
        failureMessage:
          error instanceof Error ? error.message : "Unknown reconciliation error",
        reconciliationRequiredAt: now,
        nextReconciliationAt: new Date(now.getTime() + retryDelayMs(1)),
      })
      await appendEventOnce({
        deps,
        attempt,
        eventType: "RECONCILIATION_REQUIRED",
        metadata: {
          error: error instanceof Error ? error.message : "Unknown reconciliation error",
        },
      })
      logFlightFlowError("payments.reconciliation", "attempt_failed", error, {
        paymentAttemptId: attempt.id,
      })
    }
  }

  return {
    checked,
    repaired,
    failed,
  }
}

export async function reconcilePaymentAttemptById(input: {
  paymentAttemptId: string
  now?: Date
  deps?: Partial<ReconciliationDeps>
}) {
  const deps = { ...defaultDeps, ...input.deps }
  const attempt = await deps.attemptsRepository.findById(input.paymentAttemptId)

  if (!attempt) {
    return null
  }

  await reconcilePaymentAttempt({
    attempt,
    deps,
    now: input.now ?? new Date(),
  })

  return deps.attemptsRepository.findById(input.paymentAttemptId)
}

async function reconcilePaymentAttempt(input: {
  attempt: PaymentAttemptRecord
  deps: ReconciliationDeps
  now: Date
}) {
  const { attempt, deps, now } = input

  await appendEventOnce({
    deps,
    attempt,
    eventType: "RECONCILIATION_CHECKED",
    metadata: {
      status: attempt.status,
    },
  })

  if (!attempt.providerOrderId) {
    await deps.attemptsRepository.update(attempt.id, {
      status: "reconciliation_required",
      failureCode: "provider_order_missing",
      failureMessage: "Payment attempt is missing a provider order ID.",
      reconciliationRequiredAt: now,
      nextReconciliationAt: new Date(now.getTime() + retryDelayMs(1)),
    })
    await appendEventOnce({
      deps,
      attempt,
      eventType: "RECONCILIATION_REQUIRED",
    })
    return "checked" as const
  }

  const providerOrder = await deps.getProviderOrder(attempt.providerOrderId)
  const capture = getPayPalCaptureFromOrder(providerOrder)
  const nextStatus = mapPayPalCaptureStatusToAttemptStatus(
    capture?.status ?? providerOrder.status
  )

  if (nextStatus === "capture_completed" && capture) {
    await deps.attemptsRepository.update(attempt.id, {
      status: "capture_completed",
      providerCaptureId: capture.id,
      providerStatus: capture.status ?? providerOrder.status ?? null,
      lastProviderPayload: providerOrder,
      failureCode: null,
      failureMessage: null,
      nextReconciliationAt: null,
    })
    await deps.outboxRepository.enqueueUnique({
      id: createPaymentOutboxId(),
      taskType: "fulfill_paid_resource",
      uniqueKey: `fulfill_paid_resource:${attempt.id}`,
      paymentAttemptId: attempt.id,
      internalOrderType: attempt.internalOrderType,
      internalOrderId: attempt.internalOrderId,
      payload: {
        provider: attempt.provider,
        providerPaymentId: capture.id,
        source: "reconciliation",
      },
      nextAttemptAt: now,
    })
    await appendEventOnce({
      deps,
      attempt: {
        ...attempt,
        providerCaptureId: capture.id,
        providerStatus: capture.status ?? null,
      },
      eventType: "RECONCILIATION_REPAIRED",
      metadata: {
        providerStatus: capture.status ?? providerOrder.status ?? null,
      },
    })
    return "repaired" as const
  }

  const nextReconciliationAt = new Date(now.getTime() + retryDelayMs(1))
  await deps.attemptsRepository.update(attempt.id, {
    status: nextStatus === "capture_pending" ? "capture_pending" : "reconciliation_required",
    providerStatus: capture?.status ?? providerOrder.status ?? null,
    lastProviderPayload: providerOrder,
    failureCode: nextStatus === "capture_pending" ? null : "provider_state_not_repairable",
    failureMessage:
      nextStatus === "capture_pending"
        ? null
        : "Provider state could not be safely repaired automatically.",
    reconciliationRequiredAt:
      nextStatus === "capture_pending" ? attempt.reconciliationRequiredAt : now,
    nextReconciliationAt,
  })

  if (nextStatus !== "capture_pending") {
    await appendEventOnce({
      deps,
      attempt,
      eventType: "RECONCILIATION_REQUIRED",
      metadata: {
        providerStatus: capture?.status ?? providerOrder.status ?? null,
      },
    })
  }

  return "checked" as const
}

async function appendEventOnce(input: {
  deps: Pick<ReconciliationDeps, "eventsRepository">
  attempt: PaymentAttemptRecord
  eventType: "RECONCILIATION_CHECKED" | "RECONCILIATION_REPAIRED" | "RECONCILIATION_REQUIRED"
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
