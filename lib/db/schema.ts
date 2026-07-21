import { sql } from "drizzle-orm"
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
  "finalizing",
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

export const paymentProviderEnum = pgEnum("payment_provider", ["paypal"])

export const paymentAttemptStatusEnum = pgEnum("payment_attempt_status", [
  "created",
  "provider_order_created",
  "buyer_approved",
  "capture_pending",
  "capture_completed",
  "capture_denied",
  "capture_failed",
  "refunded",
  "reversed",
  "disputed",
  "fulfillment_pending",
  "fulfilled",
  "reconciliation_required",
  "cancelled",
])

export const paymentEventTypeEnum = pgEnum("payment_event_type", [
  "PAYMENT_INITIATED",
  "PROVIDER_ORDER_CREATED",
  "BUYER_APPROVED",
  "CAPTURE_REQUESTED",
  "CAPTURE_COMPLETED",
  "CAPTURE_PENDING",
  "CAPTURE_DENIED",
  "WEBHOOK_RECEIVED",
  "WEBHOOK_PROCESSED",
  "FULFILLMENT_REQUESTED",
  "FULFILLMENT_COMPLETED",
  "FULFILLMENT_FAILED",
  "REFUND_DETECTED",
  "REVERSAL_DETECTED",
  "DISPUTE_DETECTED",
  "RECONCILIATION_CHECKED",
  "RECONCILIATION_REPAIRED",
  "RECONCILIATION_REQUIRED",
])

export const paymentWebhookInboxStatusEnum = pgEnum("payment_webhook_inbox_status", [
  "received",
  "processing",
  "processed",
  "failed",
  "ignored",
])

export const paymentOutboxStatusEnum = pgEnum("payment_outbox_status", [
  "pending",
  "processing",
  "completed",
  "failed",
])

export const paymentOutboxTaskTypeEnum = pgEnum("payment_outbox_task_type", [
  "fulfill_flight_order",
  "fulfill_paid_resource",
  "send_receipt",
  "notify_admin",
  "sync_payment_state",
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

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: text("id").primaryKey(),
    internalOrderType: text("internal_order_type").notNull(),
    internalOrderId: text("internal_order_id").notNull(),
    ownerUserId: text("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ownerGuestId: text("owner_guest_id").references(() => guestSessions.id, {
      onDelete: "set null",
    }),
    ownerOrgId: text("owner_org_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    provider: paymentProviderEnum("provider").notNull(),
    status: paymentAttemptStatusEnum("status").notNull().default("created"),
    currency: text("currency").notNull(),
    amount: numeric("amount", { precision: 14, scale: 4 }).notNull(),
    providerOrderId: text("provider_order_id"),
    providerCaptureId: text("provider_capture_id"),
    providerStatus: text("provider_status"),
    createIdempotencyKey: text("create_idempotency_key").notNull(),
    captureIdempotencyKey: text("capture_idempotency_key").notNull(),
    clientIdempotencyKey: text("client_idempotency_key").notNull(),
    checkoutPayloadSnapshot: jsonb("checkout_payload_snapshot"),
    lastProviderPayload: jsonb("last_provider_payload"),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    reconciliationRequiredAt: timestamp("reconciliation_required_at", {
      withTimezone: true,
    }),
    nextReconciliationAt: timestamp("next_reconciliation_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    providerOrderUniqueIdx: uniqueIndex("payment_attempts_provider_order_unique_idx").on(
      table.provider,
      table.providerOrderId
    ).where(sql`${table.providerOrderId} is not null`),
    internalIdempotencyUniqueIdx: uniqueIndex(
      "payment_attempts_internal_idempotency_unique_idx"
    ).on(table.internalOrderType, table.internalOrderId, table.clientIdempotencyKey),
    createIdempotencyUniqueIdx: uniqueIndex(
      "payment_attempts_create_idempotency_unique_idx"
    ).on(table.createIdempotencyKey),
    captureIdempotencyUniqueIdx: uniqueIndex(
      "payment_attempts_capture_idempotency_unique_idx"
    ).on(table.captureIdempotencyKey),
    reconciliationIdx: index("payment_attempts_reconciliation_idx").on(
      table.status,
      table.nextReconciliationAt
    ),
    ownerLookupIdx: index("payment_attempts_owner_lookup_idx").on(
      table.ownerUserId,
      table.ownerGuestId,
      table.createdAt
    ),
  })
)

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: text("id").primaryKey(),
    paymentAttemptId: text("payment_attempt_id")
      .notNull()
      .references(() => paymentAttempts.id, {
        onDelete: "cascade",
      }),
    eventType: paymentEventTypeEnum("event_type").notNull(),
    provider: paymentProviderEnum("provider").notNull(),
    providerEventId: text("provider_event_id"),
    providerOrderId: text("provider_order_id"),
    providerCaptureId: text("provider_capture_id"),
    amount: numeric("amount", { precision: 14, scale: 4 }),
    currency: text("currency"),
    payload: jsonb("payload"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    attemptTimelineIdx: index("payment_events_attempt_timeline_idx").on(
      table.paymentAttemptId,
      table.createdAt
    ),
    providerEventUniqueIdx: uniqueIndex("payment_events_provider_event_unique_idx").on(
      table.provider,
      table.providerEventId,
      table.eventType
    ).where(sql`${table.providerEventId} is not null`),
  })
)

export const paymentWebhookInbox = pgTable(
  "payment_webhook_inbox",
  {
    id: text("id").primaryKey(),
    provider: paymentProviderEnum("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    providerOrderId: text("provider_order_id"),
    providerCaptureId: text("provider_capture_id"),
    status: paymentWebhookInboxStatusEnum("status").notNull().default("received"),
    payload: jsonb("payload"),
    headers: jsonb("headers"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    claimedBy: text("claimed_by"),
    claimExpiresAt: timestamp("claim_expires_at", { withTimezone: true }),
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
    providerEventUniqueIdx: uniqueIndex(
      "payment_webhook_inbox_provider_event_unique_idx"
    ).on(table.provider, table.providerEventId),
    statusRetryIdx: index("payment_webhook_inbox_status_retry_idx").on(
      table.status,
      table.nextAttemptAt
    ),
    claimableIdx: index("payment_webhook_inbox_claimable_idx").on(
      table.status,
      table.nextAttemptAt,
      table.claimExpiresAt
    ),
    claimedIdx: index("payment_webhook_inbox_claimed_idx").on(
      table.claimedBy,
      table.claimExpiresAt
    ),
    providerOrderLookupIdx: index("payment_webhook_inbox_provider_order_lookup_idx").on(
      table.provider,
      table.providerOrderId,
      table.receivedAt
    ),
  })
)

export const paymentOutbox = pgTable(
  "payment_outbox",
  {
    id: text("id").primaryKey(),
    taskType: paymentOutboxTaskTypeEnum("task_type").notNull(),
    status: paymentOutboxStatusEnum("status").notNull().default("pending"),
    uniqueKey: text("unique_key").notNull(),
    paymentAttemptId: text("payment_attempt_id")
      .notNull()
      .references(() => paymentAttempts.id, {
        onDelete: "cascade",
      }),
    internalOrderType: text("internal_order_type").notNull(),
    internalOrderId: text("internal_order_id").notNull(),
    payload: jsonb("payload"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    claimedBy: text("claimed_by"),
    claimExpiresAt: timestamp("claim_expires_at", { withTimezone: true }),
    processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueKeyIdx: uniqueIndex("payment_outbox_unique_key_idx").on(table.uniqueKey),
    statusRetryIdx: index("payment_outbox_status_retry_idx").on(
      table.status,
      table.nextAttemptAt
    ),
    claimableIdx: index("payment_outbox_claimable_idx").on(
      table.status,
      table.nextAttemptAt,
      table.claimExpiresAt
    ),
    claimedIdx: index("payment_outbox_claimed_idx").on(
      table.claimedBy,
      table.claimExpiresAt
    ),
    attemptTimelineIdx: index("payment_outbox_attempt_timeline_idx").on(
      table.paymentAttemptId,
      table.createdAt
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
    checkoutPayloadSnapshot: jsonb("checkout_payload_snapshot"),
    paymentAttemptId: text("payment_attempt_id").references(() => paymentAttempts.id, {
      onDelete: "set null",
    }),
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
    paymentAttemptId: text("payment_attempt_id").references(() => paymentAttempts.id, {
      onDelete: "set null",
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
    paymentAttemptUniqueIdx: uniqueIndex("flight_orders_payment_attempt_unique_idx").on(
      table.paymentAttemptId
    ).where(sql`${table.paymentAttemptId} is not null`),
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

export type PaymentAttemptRow = typeof paymentAttempts.$inferSelect
export type NewPaymentAttemptRow = typeof paymentAttempts.$inferInsert

export type PaymentEventRow = typeof paymentEvents.$inferSelect
export type NewPaymentEventRow = typeof paymentEvents.$inferInsert

export type PaymentWebhookInboxRow = typeof paymentWebhookInbox.$inferSelect
export type NewPaymentWebhookInboxRow = typeof paymentWebhookInbox.$inferInsert

export type PaymentOutboxRow = typeof paymentOutbox.$inferSelect
export type NewPaymentOutboxRow = typeof paymentOutbox.$inferInsert

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
