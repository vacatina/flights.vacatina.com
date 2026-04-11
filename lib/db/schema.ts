import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

export const pricingAdjustmentTypeEnum = pgEnum("pricing_adjustment_type", [
  "percent",
  "fixed",
])

export const pricingJourneyTypeEnum = pgEnum("pricing_journey_type", [
  "one_way",
  "return",
])

export const pricedQuoteStatusEnum = pgEnum("priced_quote_status", [
  "active",
  "consumed",
  "expired",
  "cancelled",
])

export const pricingRules = pgTable(
  "pricing_rules",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    adjustmentType: pricingAdjustmentTypeEnum("adjustment_type").notNull(),
    adjustmentValue: numeric("adjustment_value", { precision: 14, scale: 4 }).notNull(),
    activeFrom: timestamp("active_from", { withTimezone: true }),
    activeTo: timestamp("active_to", { withTimezone: true }),
    journeyType: pricingJourneyTypeEnum("journey_type"),
    originIata: text("origin_iata"),
    destinationIata: text("destination_iata"),
    airlineIata: text("airline_iata"),
    cabinClass: text("cabin_class"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    activeLookupIdx: index("pricing_rules_active_lookup_idx").on(
      table.enabled,
      table.activeFrom,
      table.activeTo,
      table.priority
    ),
    scopeLookupIdx: index("pricing_rules_scope_lookup_idx").on(
      table.journeyType,
      table.originIata,
      table.destinationIata,
      table.airlineIata,
      table.cabinClass
    ),
  })
)

export const pricedQuotes = pgTable(
  "priced_quotes",
  {
    id: text("id").primaryKey(),
    partialOfferRequestId: text("partial_offer_request_id").notNull(),
    offerId: text("offer_id").notNull(),
    selectedPartialOffers: jsonb("selected_partial_offers").$type<string[]>().notNull(),
    currency: text("currency").notNull(),
    netAmount: numeric("net_amount", { precision: 14, scale: 4 }).notNull(),
    sellAmount: numeric("sell_amount", { precision: 14, scale: 4 }).notNull(),
    appliedRuleId: text("applied_rule_id").references(() => pricingRules.id, {
      onDelete: "set null",
    }),
    status: pricedQuoteStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    validationIdx: index("priced_quotes_validation_idx").on(
      table.id,
      table.status,
      table.expiresAt
    ),
    requestLookupIdx: index("priced_quotes_request_lookup_idx").on(
      table.partialOfferRequestId,
      table.offerId,
      table.createdAt
    ),
  })
)

export type PricingRuleRow = typeof pricingRules.$inferSelect
export type NewPricingRuleRow = typeof pricingRules.$inferInsert

export type PricedQuoteRow = typeof pricedQuotes.$inferSelect
export type NewPricedQuoteRow = typeof pricedQuotes.$inferInsert
