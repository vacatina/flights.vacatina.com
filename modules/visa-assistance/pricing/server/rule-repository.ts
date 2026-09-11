import "server-only"

import { randomUUID } from "node:crypto"

import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm"

import {
  getDbClient,
  users,
  visaPricingRuleEvents,
  visaPricingRules,
  type NewVisaPricingRuleRow,
  type VisaPricingRuleRow,
} from "@/lib/db"
import type { VisaPricingRule } from "@/modules/visa-assistance/pricing/domain"

export type VisaPricingRuleWrite = Omit<
  NewVisaPricingRuleRow,
  "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>

export interface VisaPricingAuditEvent {
  id: string
  ruleId: string
  ruleName: string
  eventType: "created" | "updated" | "enabled" | "disabled"
  reason: string | null
  actorEmail: string | null
  createdAt: Date
}

export interface VisaPricingRuleRepository {
  listActiveCandidates(now: Date): Promise<VisaPricingRule[]>
  listAll(): Promise<VisaPricingRule[]>
  findById(id: string): Promise<VisaPricingRule | null>
  listRecentEvents(limit?: number): Promise<VisaPricingAuditEvent[]>
  create(input: {
    rule: VisaPricingRuleWrite
    actorUserId: string
    reason: string | null
  }): Promise<VisaPricingRule>
  update(input: {
    id: string
    rule: VisaPricingRuleWrite
    actorUserId: string
    reason: string | null
  }): Promise<VisaPricingRule>
  setEnabled(input: {
    id: string
    enabled: boolean
    actorUserId: string
    reason: string | null
  }): Promise<VisaPricingRule>
}

export const defaultVisaPricingRuleRepository: VisaPricingRuleRepository = {
  async listActiveCandidates(now) {
    const db = getDbClient()
    if (!db) return []

    const rows = await db
      .select()
      .from(visaPricingRules)
      .where(
        and(
          eq(visaPricingRules.enabled, true),
          or(
            isNull(visaPricingRules.activeFrom),
            lte(visaPricingRules.activeFrom, now)
          ),
          or(
            isNull(visaPricingRules.activeTo),
            gte(visaPricingRules.activeTo, now)
          )
        )
      )
      .orderBy(
        desc(visaPricingRules.priority),
        desc(visaPricingRules.updatedAt)
      )

    return rows.map(mapRuleRow)
  },

  async listAll() {
    const db = getDbClient()
    if (!db) return []
    const rows = await db
      .select()
      .from(visaPricingRules)
      .orderBy(
        desc(visaPricingRules.enabled),
        desc(visaPricingRules.priority),
        desc(visaPricingRules.updatedAt)
      )
    return rows.map(mapRuleRow)
  },

  async findById(id) {
    const db = getDbClient()
    if (!db) return null
    const [row] = await db
      .select()
      .from(visaPricingRules)
      .where(eq(visaPricingRules.id, id))
      .limit(1)
    return row ? mapRuleRow(row) : null
  },

  async listRecentEvents(limit = 20) {
    const db = getDbClient()
    if (!db) return []
    const rows = await db
      .select({
        id: visaPricingRuleEvents.id,
        ruleId: visaPricingRuleEvents.ruleId,
        ruleName: visaPricingRules.name,
        eventType: visaPricingRuleEvents.eventType,
        reason: visaPricingRuleEvents.reason,
        actorEmail: users.primaryEmail,
        createdAt: visaPricingRuleEvents.createdAt,
      })
      .from(visaPricingRuleEvents)
      .innerJoin(
        visaPricingRules,
        eq(visaPricingRuleEvents.ruleId, visaPricingRules.id)
      )
      .leftJoin(users, eq(visaPricingRuleEvents.actorUserId, users.id))
      .orderBy(desc(visaPricingRuleEvents.createdAt))
      .limit(Math.max(1, Math.min(limit, 100)))
    return rows
  },

  async create(input) {
    const db = requireDb()
    return db.transaction(async (tx) => {
      const now = new Date()
      const id = createRuleId()
      const [row] = await tx
        .insert(visaPricingRules)
        .values({
          ...input.rule,
          id,
          createdBy: input.actorUserId,
          updatedBy: input.actorUserId,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
      if (!row) throw new Error("Visa pricing rule was not created.")

      await tx.insert(visaPricingRuleEvents).values({
        id: createEventId(),
        ruleId: id,
        actorUserId: input.actorUserId,
        eventType: "created",
        reason: input.reason,
        beforeSnapshot: null,
        afterSnapshot: toAuditSnapshot(row),
      })
      return mapRuleRow(row)
    })
  },

  async update(input) {
    const db = requireDb()
    return db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(visaPricingRules)
        .where(eq(visaPricingRules.id, input.id))
        .limit(1)
      if (!before) throw new Error("Visa pricing rule was not found.")

      const [after] = await tx
        .update(visaPricingRules)
        .set({
          ...input.rule,
          updatedBy: input.actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(visaPricingRules.id, input.id))
        .returning()
      if (!after) throw new Error("Visa pricing rule was not updated.")

      await tx.insert(visaPricingRuleEvents).values({
        id: createEventId(),
        ruleId: input.id,
        actorUserId: input.actorUserId,
        eventType: "updated",
        reason: input.reason,
        beforeSnapshot: toAuditSnapshot(before),
        afterSnapshot: toAuditSnapshot(after),
      })
      return mapRuleRow(after)
    })
  },

  async setEnabled(input) {
    const db = requireDb()
    return db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(visaPricingRules)
        .where(eq(visaPricingRules.id, input.id))
        .limit(1)
      if (!before) throw new Error("Visa pricing rule was not found.")

      const [after] = await tx
        .update(visaPricingRules)
        .set({
          enabled: input.enabled,
          updatedBy: input.actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(visaPricingRules.id, input.id))
        .returning()
      if (!after) throw new Error("Visa pricing rule status was not updated.")

      await tx.insert(visaPricingRuleEvents).values({
        id: createEventId(),
        ruleId: input.id,
        actorUserId: input.actorUserId,
        eventType: input.enabled ? "enabled" : "disabled",
        reason: input.reason,
        beforeSnapshot: toAuditSnapshot(before),
        afterSnapshot: toAuditSnapshot(after),
      })
      return mapRuleRow(after)
    })
  },
}

function mapRuleRow(row: VisaPricingRuleRow): VisaPricingRule {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    priority: row.priority,
    feeComponent: row.feeComponent,
    adjustmentType: row.adjustmentType,
    adjustmentAmount: row.adjustmentAmount,
    adjustmentScale: row.adjustmentScale,
    adjustmentCurrency: row.adjustmentCurrency,
    nationalityCode: row.nationalityCode,
    destinationCode: row.destinationCode,
    visaTypeId: row.visaTypeId,
    providerProductId: row.providerProductId,
    activeFrom: row.activeFrom,
    activeTo: row.activeTo,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toAuditSnapshot(row: VisaPricingRuleRow) {
  return {
    ...row,
    activeFrom: row.activeFrom?.toISOString() ?? null,
    activeTo: row.activeTo?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function requireDb() {
  const db = getDbClient()
  if (!db) throw new Error("Database is unavailable.")
  return db
}

function createRuleId() {
  return `vpr_${randomUUID().replaceAll("-", "")}`
}

function createEventId() {
  return `vpe_${randomUUID().replaceAll("-", "")}`
}
