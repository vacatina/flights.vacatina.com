import "server-only"

import { and, asc, eq, lte } from "drizzle-orm"

import { getDbClient, notificationOutbox } from "@/lib/db"
import type {
  NotificationEventType,
  NotificationOutboxPayload,
  NotificationOutboxStatus,
} from "@/modules/notifications/domain"

export interface NotificationOutboxRecord {
  id: string
  eventType: NotificationEventType
  status: NotificationOutboxStatus
  flightOrderId: string | null
  checkoutSessionId: string | null
  bookingReference: string | null
  recipientEmail: string
  recipientEmailHash: string
  payload: NotificationOutboxPayload | null
  attemptCount: number
  lastError: string | null
  sentAt: Date | null
  nextAttemptAt: Date
  createdAt: Date
  updatedAt: Date
}

interface CreateOutboxRecordInput {
  id: string
  eventType: NotificationEventType
  flightOrderId: string | null
  checkoutSessionId: string | null
  bookingReference: string | null
  recipientEmail: string
  recipientEmailHash: string
  payload: NotificationOutboxPayload
}

export interface NotificationOutboxRepository {
  create(input: CreateOutboxRecordInput): Promise<NotificationOutboxRecord>
  findPending(now: Date, limit: number): Promise<NotificationOutboxRecord[]>
  markSent(input: { id: string; sentAt: Date }): Promise<void>
  markFailed(input: {
    id: string
    nextAttemptAt: Date
    lastError: string
    permanent?: boolean
  }): Promise<void>
}

const inMemoryOutbox = new Map<string, NotificationOutboxRecord>()

export const defaultNotificationOutboxRepository: NotificationOutboxRepository = {
  async create(input) {
    const db = getDbClient()
    const now = new Date()

    if (!db) {
      const record: NotificationOutboxRecord = {
        ...input,
        status: "pending",
        payload: input.payload,
        attemptCount: 0,
        lastError: null,
        sentAt: null,
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      }
      inMemoryOutbox.set(record.id, record)
      return record
    }

    const [row] = await db
      .insert(notificationOutbox)
      .values({
        id: input.id,
        eventType: input.eventType,
        status: "pending",
        flightOrderId: input.flightOrderId,
        checkoutSessionId: input.checkoutSessionId,
        bookingReference: input.bookingReference,
        recipientEmail: input.recipientEmail,
        recipientEmailHash: input.recipientEmailHash,
        payload: input.payload,
        attemptCount: 0,
        lastError: null,
        sentAt: null,
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return toRecord(row)
  },
  async findPending(now, limit) {
    const db = getDbClient()

    if (!db) {
      return Array.from(inMemoryOutbox.values())
        .filter((record) => record.status === "pending" && record.nextAttemptAt <= now)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .slice(0, limit)
    }

    const rows = await db.query.notificationOutbox.findMany({
      where: and(
        eq(notificationOutbox.status, "pending"),
        lte(notificationOutbox.nextAttemptAt, now)
      ),
      orderBy: [asc(notificationOutbox.createdAt)],
      limit,
    })

    return rows.map(toRecord)
  },
  async markSent(input) {
    const db = getDbClient()

    if (!db) {
      const current = inMemoryOutbox.get(input.id)
      if (!current) {
        return
      }
      inMemoryOutbox.set(input.id, {
        ...current,
        status: "sent",
        sentAt: input.sentAt,
        updatedAt: new Date(),
      })
      return
    }

    await db
      .update(notificationOutbox)
      .set({
        status: "sent",
        sentAt: input.sentAt,
        updatedAt: new Date(),
      })
      .where(eq(notificationOutbox.id, input.id))
  },
  async markFailed(input) {
    const db = getDbClient()

    if (!db) {
      const current = inMemoryOutbox.get(input.id)
      if (!current) {
        return
      }
      inMemoryOutbox.set(input.id, {
        ...current,
        attemptCount: current.attemptCount + 1,
        status: input.permanent ? "failed" : "pending",
        nextAttemptAt: input.nextAttemptAt,
        lastError: input.lastError,
        updatedAt: new Date(),
      })
      return
    }

    const current = await db.query.notificationOutbox.findFirst({
      where: eq(notificationOutbox.id, input.id),
      columns: { attemptCount: true },
    })
    const nextAttemptCount = (current?.attemptCount ?? 0) + 1
    await db
      .update(notificationOutbox)
      .set({
        attemptCount: nextAttemptCount,
        status: input.permanent ? "failed" : "pending",
        lastError: input.lastError,
        nextAttemptAt: input.nextAttemptAt,
        updatedAt: new Date(),
      })
      .where(eq(notificationOutbox.id, input.id))
  },
}

function toRecord(row: typeof notificationOutbox.$inferSelect): NotificationOutboxRecord {
  return {
    id: row.id,
    eventType: row.eventType,
    status: row.status,
    flightOrderId: row.flightOrderId,
    checkoutSessionId: row.checkoutSessionId,
    bookingReference: row.bookingReference,
    recipientEmail: row.recipientEmail,
    recipientEmailHash: row.recipientEmailHash,
    payload:
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as NotificationOutboxPayload)
        : null,
    attemptCount: row.attemptCount,
    lastError: row.lastError,
    sentAt: row.sentAt,
    nextAttemptAt: row.nextAttemptAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function resetInMemoryNotificationOutboxForTests() {
  inMemoryOutbox.clear()
}
