import "server-only"

import { randomUUID } from "node:crypto"

export function createPaymentAttemptId() {
  return `pat_${compactUuid()}`
}

export function createPaymentEventId() {
  return `pev_${compactUuid()}`
}

export function createPaymentWebhookInboxId() {
  return `pwi_${compactUuid()}`
}

export function createPaymentOutboxId() {
  return `pob_${compactUuid()}`
}

function compactUuid() {
  return randomUUID().replaceAll("-", "")
}
