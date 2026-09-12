import "server-only"

import { getVisaCountry } from "@/modules/visa-assistance/domain"
import {
  parseVisaAdjustment,
  scaledIntegerToDecimal,
  type VisaPricingAdjustmentType,
  type VisaPricingFeeComponent,
  type VisaPricingRule,
} from "@/modules/visa-assistance/pricing/domain"
import {
  defaultVisaPricingRuleRepository,
  type VisaPricingRuleRepository,
  type VisaPricingRuleWrite,
} from "@/modules/visa-assistance/pricing/server/rule-repository"

export interface VisaPricingRuleInput {
  name: string
  enabled?: boolean
  priority: number
  feeComponent: VisaPricingFeeComponent
  adjustmentType: VisaPricingAdjustmentType
  adjustmentValue: string
  adjustmentCurrency?: string | null
  nationalityCode?: string | null
  destinationCode?: string | null
  visaTypeId?: string | null
  providerProductId?: string | null
  activeFrom?: Date | null
  activeTo?: Date | null
  reason?: string | null
}

export async function createVisaPricingRule(
  input: VisaPricingRuleInput & { actorUserId: string },
  repository: VisaPricingRuleRepository = defaultVisaPricingRuleRepository
) {
  const normalized = normalizeRuleInput(input)
  await assertNoAmbiguousRule(normalized, null, repository)
  return repository.create({
    rule: normalized,
    actorUserId: input.actorUserId,
    reason: normalizeOptional(input.reason),
  })
}

export async function updateVisaPricingRule(
  input: VisaPricingRuleInput & { id: string; actorUserId: string },
  repository: VisaPricingRuleRepository = defaultVisaPricingRuleRepository
) {
  const current = await repository.findById(input.id)
  if (!current) throw new Error("Visa pricing rule was not found.")

  const normalized = normalizeRuleInput({
    ...input,
    enabled: current.enabled,
  })
  await assertNoAmbiguousRule(normalized, input.id, repository)
  return repository.update({
    id: input.id,
    rule: normalized,
    actorUserId: input.actorUserId,
    reason: normalizeOptional(input.reason),
  })
}

export async function setVisaPricingRuleEnabled(
  input: {
    id: string
    enabled: boolean
    actorUserId: string
    reason?: string | null
  },
  repository: VisaPricingRuleRepository = defaultVisaPricingRuleRepository
) {
  if (input.enabled) {
    const current = await repository.findById(input.id)
    if (!current) throw new Error("Visa pricing rule was not found.")
    await assertNoAmbiguousRule(
      { ...current, enabled: true },
      input.id,
      repository
    )
  }

  return repository.setEnabled({
    ...input,
    reason: normalizeOptional(input.reason),
  })
}

function normalizeRuleInput(input: VisaPricingRuleInput): VisaPricingRuleWrite {
  const name = input.name.trim()
  if (!name || name.length > 120) {
    throw new Error("Rule name must be between 1 and 120 characters.")
  }
  if (
    !Number.isInteger(input.priority) ||
    input.priority < 0 ||
    input.priority > 1000
  ) {
    throw new Error("Priority must be a whole number between 0 and 1000.")
  }
  if (!isFeeComponent(input.feeComponent)) {
    throw new Error("Select a valid visa fee component.")
  }
  if (input.adjustmentType !== "percent" && input.adjustmentType !== "fixed") {
    throw new Error("Select a valid adjustment type.")
  }

  const nationalityCode = normalizeCountry(input.nationalityCode, "nationality")
  const destinationCode = normalizeCountry(input.destinationCode, "destination")
  const activeFrom = input.activeFrom ?? null
  const activeTo = input.activeTo ?? null
  if (activeFrom && activeTo && activeFrom.getTime() >= activeTo.getTime()) {
    throw new Error("The active-until date must be later than active-from.")
  }

  const adjustment = parseVisaAdjustment({
    type: input.adjustmentType,
    value: input.adjustmentValue,
    currency: input.adjustmentCurrency,
  })

  return {
    name,
    enabled: input.enabled ?? true,
    priority: input.priority,
    feeComponent: input.feeComponent,
    adjustmentType: input.adjustmentType,
    adjustmentAmount: adjustment.amount,
    adjustmentScale: adjustment.scale,
    adjustmentCurrency: adjustment.currency,
    nationalityCode,
    destinationCode,
    visaTypeId: normalizeOptional(input.visaTypeId),
    providerProductId: normalizeOptional(input.providerProductId),
    activeFrom,
    activeTo,
  }
}

async function assertNoAmbiguousRule(
  input: VisaPricingRuleWrite,
  currentRuleId: string | null,
  repository: VisaPricingRuleRepository
) {
  const rules = await repository.listAll()
  const conflict = rules.find(
    (rule) =>
      rule.id !== currentRuleId &&
      rule.enabled &&
      input.enabled !== false &&
      rule.feeComponent === input.feeComponent &&
      rule.priority === input.priority &&
      sameOptional(rule.nationalityCode, input.nationalityCode) &&
      sameOptional(rule.destinationCode, input.destinationCode) &&
      sameOptional(rule.visaTypeId, input.visaTypeId) &&
      sameOptional(rule.providerProductId, input.providerProductId) &&
      windowsOverlap(
        rule.activeFrom,
        rule.activeTo,
        input.activeFrom ?? null,
        input.activeTo ?? null
      )
  )

  if (conflict) {
    throw new Error(
      `This rule overlaps with “${conflict.name}” at the same scope and priority.`
    )
  }
}

function windowsOverlap(
  leftFrom: Date | null,
  leftTo: Date | null,
  rightFrom: Date | null,
  rightTo: Date | null
) {
  const leftStart = leftFrom?.getTime() ?? Number.NEGATIVE_INFINITY
  const leftEnd = leftTo?.getTime() ?? Number.POSITIVE_INFINITY
  const rightStart = rightFrom?.getTime() ?? Number.NEGATIVE_INFINITY
  const rightEnd = rightTo?.getTime() ?? Number.POSITIVE_INFINITY
  return leftStart <= rightEnd && rightStart <= leftEnd
}

function normalizeCountry(value: string | null | undefined, label: string) {
  const normalized = normalizeOptional(value)?.toUpperCase() ?? null
  if (normalized && !getVisaCountry(normalized)) {
    throw new Error(`Select a valid ${label} country.`)
  }
  return normalized
}

function normalizeOptional(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized || null
}

function sameOptional(left: unknown, right: unknown) {
  return (
    normalizeOptional(String(left ?? "")) ===
    normalizeOptional(String(right ?? ""))
  )
}

function isFeeComponent(value: unknown): value is VisaPricingFeeComponent {
  return value === "processing_fee" || value === "government_fee"
}

export function toVisaPricingRuleInput(rule: VisaPricingRule) {
  return {
    name: rule.name,
    enabled: rule.enabled,
    priority: rule.priority,
    feeComponent: rule.feeComponent,
    adjustmentType: rule.adjustmentType,
    adjustmentValue: scaledIntegerToDecimal(
      rule.adjustmentAmount,
      rule.adjustmentScale
    ),
    adjustmentCurrency: rule.adjustmentCurrency,
    nationalityCode: rule.nationalityCode,
    destinationCode: rule.destinationCode,
    visaTypeId: rule.visaTypeId,
    providerProductId: rule.providerProductId,
    activeFrom: rule.activeFrom,
    activeTo: rule.activeTo,
  }
}
