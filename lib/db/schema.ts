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

export const checkoutSessionStatusEnum = pgEnum("checkout_session_status", [
  "processing",
  "payment_authorized",
  "completed",
  "failed",
  "reconciliation_required",
])

export const checkoutPaymentModeEnum = pgEnum("checkout_payment_mode", [
  "pay_now",
  "hold",
])

export const checkoutSettlementTypeEnum = pgEnum("checkout_settlement_type", [
  "balance",
])

export const notificationOutboxStatusEnum = pgEnum("notification_outbox_status", [
  "pending",
  "sent",
  "failed",
])

export const notificationEventTypeEnum = pgEnum("notification_event_type", [
  "booking_confirmed",
  "hold_created",
  "reconciliation_required",
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

export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: text("id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    partialOfferRequestId: text("partial_offer_request_id").notNull(),
    quoteId: text("quote_id")
      .notNull()
      .references(() => pricedQuotes.id, {
        onDelete: "cascade",
      }),
    offerId: text("offer_id").notNull(),
    selectedPartialOffers: jsonb("selected_partial_offers").$type<string[]>().notNull(),
    ownerUserId: text("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ownerGuestId: text("owner_guest_id").references(() => guestSessions.id, {
      onDelete: "set null",
    }),
    ownerOrgId: text("owner_org_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    paymentMode: checkoutPaymentModeEnum("payment_mode").notNull(),
    currency: text("currency").notNull(),
    netAmount: numeric("net_amount", { precision: 14, scale: 4 }).notNull(),
    sellAmount: numeric("sell_amount", { precision: 14, scale: 4 }).notNull(),
    paymentProvider: text("payment_provider"),
    providerOrderId: text("provider_order_id"),
    providerPaymentId: text("provider_payment_id"),
    providerStatusCode: text("provider_status_code"),
    providerStatusMessage: text("provider_status_message"),
    paymentCurrency: text("payment_currency"),
    paymentAmount: numeric("payment_amount", { precision: 14, scale: 4 }),
    fxSourceCurrency: text("fx_source_currency"),
    fxTargetCurrency: text("fx_target_currency"),
    fxBaseRate: numeric("fx_base_rate", { precision: 18, scale: 8 }),
    fxBufferPercent: numeric("fx_buffer_percent", { precision: 8, scale: 4 }),
    fxEffectiveRate: numeric("fx_effective_rate", { precision: 18, scale: 8 }),
    checkoutPayloadSnapshot: jsonb("checkout_payload_snapshot"),
    externalPaymentAuthorizationId: text("external_payment_authorization_id"),
    externalPaymentCaptureId: text("external_payment_capture_id"),
    duffelOrderId: text("duffel_order_id"),
    paymentInitiatedAt: timestamp("payment_initiated_at", { withTimezone: true }),
    paymentConfirmedAt: timestamp("payment_confirmed_at", { withTimezone: true }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    status: checkoutSessionStatusEnum("status").notNull().default("processing"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idempotencyKeyUniqueIdx: uniqueIndex("checkout_sessions_idempotency_key_unique_idx").on(
      table.idempotencyKey
    ),
    lifecycleIdx: index("checkout_sessions_lifecycle_idx").on(
      table.status,
      table.expiresAt
    ),
    requestLookupIdx: index("checkout_sessions_request_lookup_idx").on(
      table.partialOfferRequestId,
      table.offerId,
      table.createdAt
    ),
    providerOrderIdUniqueIdx: uniqueIndex("checkout_sessions_provider_order_id_unique_idx").on(
      table.providerOrderId
    ),
  })
)

export const paymentWebhookEvents = pgTable(
  "payment_webhook_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    eventKey: text("event_key").notNull(),
    providerOrderId: text("provider_order_id").notNull(),
    providerPaymentId: text("provider_payment_id"),
    payload: jsonb("payload"),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    providerEventUniqueIdx: uniqueIndex("payment_webhook_events_provider_event_unique_idx").on(
      table.provider,
      table.eventKey
    ),
    providerOrderLookupIdx: index("payment_webhook_events_provider_order_lookup_idx").on(
      table.provider,
      table.providerOrderId,
      table.createdAt
    ),
  })
)

export const flightOrders = pgTable(
  "flight_orders",
  {
    id: text("id").primaryKey(),
    bookingReference: text("booking_reference").notNull(),
    checkoutSessionId: text("checkout_session_id")
      .notNull()
      .references(() => checkoutSessions.id, {
        onDelete: "cascade",
      }),
    duffelOrderId: text("duffel_order_id").notNull(),
    partialOfferRequestId: text("partial_offer_request_id").notNull(),
    offerId: text("offer_id").notNull(),
    selectedPartialOffers: jsonb("selected_partial_offers").$type<string[]>().notNull(),
    ownerUserId: text("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ownerGuestId: text("owner_guest_id").references(() => guestSessions.id, {
      onDelete: "set null",
    }),
    ownerOrgId: text("owner_org_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    contactEmail: text("contact_email").notNull(),
    contactEmailHash: text("contact_email_hash").notNull(),
    paymentMode: checkoutPaymentModeEnum("payment_mode").notNull(),
    settlementType: checkoutSettlementTypeEnum("settlement_type")
      .notNull()
      .default("balance"),
    currency: text("currency").notNull(),
    netAmount: numeric("net_amount", { precision: 14, scale: 4 }).notNull(),
    sellAmount: numeric("sell_amount", { precision: 14, scale: 4 }).notNull(),
    duffelTotalAmount: numeric("duffel_total_amount", {
      precision: 14,
      scale: 4,
    }).notNull(),
    duffelTotalCurrency: text("duffel_total_currency").notNull(),
    paymentAwaiting: boolean("payment_awaiting").notNull().default(false),
    paymentRequiredBy: timestamp("payment_required_by", { withTimezone: true }),
    priceGuaranteeExpiresAt: timestamp("price_guarantee_expires_at", {
      withTimezone: true,
    }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    orderSnapshot: jsonb("order_snapshot").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    checkoutSessionUniqueIdx: uniqueIndex("flight_orders_checkout_session_unique_idx").on(
      table.checkoutSessionId
    ),
    bookingReferenceUniqueIdx: uniqueIndex("flight_orders_booking_reference_unique_idx").on(
      table.bookingReference
    ),
    duffelOrderUniqueIdx: uniqueIndex("flight_orders_duffel_order_unique_idx").on(
      table.duffelOrderId
    ),
    contactEmailHashLookupIdx: index("flight_orders_contact_email_hash_lookup_idx").on(
      table.contactEmailHash
    ),
    ownerLookupIdx: index("flight_orders_owner_lookup_idx").on(
      table.ownerUserId,
      table.ownerGuestId,
      table.createdAt
    ),
    requestLookupIdx: index("flight_orders_request_lookup_idx").on(
      table.partialOfferRequestId,
      table.offerId,
      table.createdAt
    ),
  })
)

export const notificationOutbox = pgTable(
  "notification_outbox",
  {
    id: text("id").primaryKey(),
    eventType: notificationEventTypeEnum("event_type").notNull(),
    status: notificationOutboxStatusEnum("status").notNull().default("pending"),
    flightOrderId: text("flight_order_id").references(() => flightOrders.id, {
      onDelete: "set null",
    }),
    checkoutSessionId: text("checkout_session_id").references(() => checkoutSessions.id, {
      onDelete: "set null",
    }),
    bookingReference: text("booking_reference"),
    recipientEmail: text("recipient_email").notNull(),
    recipientEmailHash: text("recipient_email_hash").notNull(),
    payload: jsonb("payload"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    statusRetryIdx: index("notification_outbox_status_retry_idx").on(
      table.status,
      table.nextAttemptAt
    ),
    recipientLookupIdx: index("notification_outbox_recipient_lookup_idx").on(
      table.recipientEmailHash,
      table.createdAt
    ),
    flightOrderLookupIdx: index("notification_outbox_flight_order_lookup_idx").on(
      table.flightOrderId,
      table.createdAt
    ),
  })
)

export type PricingRuleRow = typeof pricingRules.$inferSelect
export type NewPricingRuleRow = typeof pricingRules.$inferInsert

export type PricedQuoteRow = typeof pricedQuotes.$inferSelect
export type NewPricedQuoteRow = typeof pricedQuotes.$inferInsert

export type CheckoutSessionRow = typeof checkoutSessions.$inferSelect
export type NewCheckoutSessionRow = typeof checkoutSessions.$inferInsert

export type FlightOrderRow = typeof flightOrders.$inferSelect
export type NewFlightOrderRow = typeof flightOrders.$inferInsert

export type NotificationOutboxRow = typeof notificationOutbox.$inferSelect
export type NewNotificationOutboxRow = typeof notificationOutbox.$inferInsert

export type PaymentWebhookEventRow = typeof paymentWebhookEvents.$inferSelect
export type NewPaymentWebhookEventRow = typeof paymentWebhookEvents.$inferInsert

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
