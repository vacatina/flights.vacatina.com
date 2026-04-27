import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm"

import { getDbClient, pricingRules } from "@/lib/db"
import { toNumeric } from "@/lib/shared/number"
import type { PricingRule } from "@/modules/flights/pricing/domain"
import { logFlightFlow } from "@/lib/logging/flow-debug"

export interface PricingRuleRepository {
  listMatchingCandidates(now: Date): Promise<PricingRule[]>
}

export const defaultPricingRuleRepository: PricingRuleRepository = {
  async listMatchingCandidates(now) {
    const db = getDbClient()

    if (!db) {
      logFlightFlow("pricing.ruleRepository", "db_unavailable_returning_empty", {
        now: now.toISOString(),
      })
      return []
    }

    const rows = await db
      .select()
      .from(pricingRules)
      .where(
        and(
          eq(pricingRules.enabled, true),
          or(isNull(pricingRules.activeFrom), lte(pricingRules.activeFrom, now)),
          or(isNull(pricingRules.activeTo), gte(pricingRules.activeTo, now))
        )
      )
      .orderBy(desc(pricingRules.priority), desc(pricingRules.updatedAt))

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      enabled: row.enabled,
      priority: row.priority,
      adjustmentType: row.adjustmentType,
      adjustmentValue: toNumeric(row.adjustmentValue),
      activeFrom: row.activeFrom,
      activeTo: row.activeTo,
      journeyType: row.journeyType,
      originIata: row.originIata,
      destinationIata: row.destinationIata,
      airlineIata: row.airlineIata,
      cabinClass: row.cabinClass,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  },
}
