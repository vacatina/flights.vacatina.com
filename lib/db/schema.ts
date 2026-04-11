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
  uniqueIndex,
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

export const guestSessionStatusEnum = pgEnum("guest_session_status", [
  "active",
  "linked",
  "expired",
  "revoked",
])

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  primaryEmail: text("primary_email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex("organizations_slug_unique_idx").on(table.slug),
  })
)

export const guestSessions = pgTable(
  "guest_sessions",
  {
    id: text("id").primaryKey(),
    status: guestSessionStatusEnum("status").notNull().default("active"),
    linkedUserId: text("linked_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    lifecycleIdx: index("guest_sessions_lifecycle_idx").on(
      table.status,
      table.expiresAt
    ),
  })
)

export const guestUserLinks = pgTable(
  "guest_user_links",
  {
    id: text("id").primaryKey(),
    guestSessionId: text("guest_session_id")
      .notNull()
      .references(() => guestSessions.id, {
        onDelete: "cascade",
      }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    guestSessionUniqueIdx: uniqueIndex("guest_user_links_guest_session_unique_idx").on(
      table.guestSessionId
    ),
    userLookupIdx: index("guest_user_links_user_lookup_idx").on(table.userId),
  })
)

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    role: text("role").notNull().default("org:member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgUserUniqueIdx: uniqueIndex("organization_members_org_user_unique_idx").on(
      table.organizationId,
      table.userId
    ),
    orgLookupIdx: index("organization_members_org_lookup_idx").on(table.organizationId),
    userLookupIdx: index("organization_members_user_lookup_idx").on(table.userId),
  })
)

export const clerkWebhookEvents = pgTable("clerk_webhook_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

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
    ownerUserId: text("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ownerGuestId: text("owner_guest_id").references(() => guestSessions.id, {
      onDelete: "set null",
    }),
    ownerOrgId: text("owner_org_id").references(() => organizations.id, {
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
    ownerLookupIdx: index("priced_quotes_owner_lookup_idx").on(
      table.ownerUserId,
      table.ownerGuestId
    ),
  })
)

export type PricingRuleRow = typeof pricingRules.$inferSelect
export type NewPricingRuleRow = typeof pricingRules.$inferInsert

export type PricedQuoteRow = typeof pricedQuotes.$inferSelect
export type NewPricedQuoteRow = typeof pricedQuotes.$inferInsert

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert

export type GuestSessionRow = typeof guestSessions.$inferSelect
export type NewGuestSessionRow = typeof guestSessions.$inferInsert

export type GuestUserLinkRow = typeof guestUserLinks.$inferSelect
export type NewGuestUserLinkRow = typeof guestUserLinks.$inferInsert

export type OrganizationRow = typeof organizations.$inferSelect
export type NewOrganizationRow = typeof organizations.$inferInsert

export type OrganizationMemberRow = typeof organizationMembers.$inferSelect
export type NewOrganizationMemberRow = typeof organizationMembers.$inferInsert

export type ClerkWebhookEventRow = typeof clerkWebhookEvents.$inferSelect
export type NewClerkWebhookEventRow = typeof clerkWebhookEvents.$inferInsert
