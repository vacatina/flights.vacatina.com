import "server-only"

import type { Order } from "@duffel/api/types"

import type { ActorContext } from "@/modules/auth/types"
import { GUEST_UNAVAILABLE_ID } from "@/modules/auth/constants"
import {
  bookingDetailInputSchema,
  bookingListInputSchema,
  bookingLookupInputSchema,
  mapFlightOrderToDetailModel,
  mapFlightOrderToListItem,
} from "@/modules/flights/orders/domain"
import {
  canGuestAccessBooking,
  setBookingLookupAccessCookie,
} from "@/modules/flights/orders/server/guest-access"
import { createEmailHash, isEmailHashMatch } from "@/modules/flights/orders/server/identity"
import { consumeBookingLookupAttempt } from "@/modules/flights/orders/server/lookup-rate-limit"
import {
  defaultCheckoutSessionRepository,
  type CheckoutSessionRepository,
} from "@/modules/flights/checkout/server/session-repository"
import {
  defaultFlightOrderRepository,
  type FlightOrderRepository,
} from "@/modules/flights/checkout/server/order-repository"
import {
  defaultNotificationOutboxRepository,
  type NotificationOutboxRepository,
} from "@/modules/notifications/server/outbox-repository"
import {
  defaultCancellationRepository,
  type CancellationRepository,
} from "@/modules/flights/cancellations/server/repository"
import { logDuffelError } from "@/modules/flights/results/server/error-map"
import { logFlightFlow, logFlightFlowError } from "@/lib/logging/flow-debug"

const GENERIC_LOOKUP_ERROR =
  "Booking not found. Please check your reference and email."

interface OrdersServiceDeps {
  orderRepository: FlightOrderRepository
  checkoutSessionRepository: CheckoutSessionRepository
  notificationOutboxRepository: NotificationOutboxRepository
  cancellationRepository?: Pick<
    CancellationRepository,
    "findLatestRequestByFlightOrderId"
  >
  getDuffelOrderById: (duffelOrderId: string) => Promise<Order | null>
}

const defaultDeps: OrdersServiceDeps = {
  orderRepository: defaultFlightOrderRepository,
  checkoutSessionRepository: defaultCheckoutSessionRepository,
  notificationOutboxRepository: defaultNotificationOutboxRepository,
  cancellationRepository: defaultCancellationRepository,
  async getDuffelOrderById(duffelOrderId) {
    try {
      const { getDuffelClient } = await import("@/lib/duffel")
      const client = getDuffelClient()
      const response = await client.orders.get(duffelOrderId)
      return response.data as Order
    } catch (error) {
      logDuffelError("orders.get failed", error, { duffelOrderId })
      return null
    }
  },
}

export async function listMyBookings(
  input: {
    actor: ActorContext
    page: number
    pageSize: number
    q?: string
    status?: "all" | "confirmed" | "payment_pending" | "on_hold"
    sort?: "newest" | "oldest" | "amount_high" | "amount_low"
  },
  deps: OrdersServiceDeps = defaultDeps
) {
  if (input.actor.type !== "user") {
    throw new Error("Sign in to view your bookings.")
  }

  const parsed = bookingListInputSchema.parse({
    page: input.page,
    pageSize: input.pageSize,
    q: input.q,
    status: input.status,
    sort: input.sort,
  })
  const offset = (parsed.page - 1) * parsed.pageSize
  const result = await deps.orderRepository.listByOwnerUserId({
    ownerUserId: input.actor.appUserId,
    limit: parsed.pageSize,
    offset,
    q: parsed.q,
    status: parsed.status,
    sort: parsed.sort,
  })
  const cancellationRequests = deps.cancellationRepository
    ? await Promise.all(
        result.records.map((order) =>
          deps.cancellationRepository?.findLatestRequestByFlightOrderId(order.id)
        )
      )
    : result.records.map(() => null)

  return {
    page: parsed.page,
    pageSize: parsed.pageSize,
    q: parsed.q,
    status: parsed.status,
    sort: parsed.sort,
    total: result.total,
    items: result.records.map((order, index) =>
      mapFlightOrderToListItem(order, {
        cancellationStatus: cancellationRequests[index]?.status ?? null,
      })
    ),
  }
}

export async function lookupBookingByReferenceAndEmail(
  input: {
    reference: string
    email: string
    ipAddress: string
  },
  deps: OrdersServiceDeps = defaultDeps
) {
  const parsed = bookingLookupInputSchema.parse(input)
  const attempt = consumeBookingLookupAttempt({
    ipAddress: input.ipAddress,
    bookingReference: parsed.reference,
  })

  if (!attempt.allowed) {
    throw new Error("Too many attempts. Please try again in a few minutes.")
  }

  const order = await deps.orderRepository.findByBookingReference(parsed.reference)

  if (!order) {
    throw new Error(GENERIC_LOOKUP_ERROR)
  }

  if (
    !isEmailHashMatch({
      expectedHash: order.contactEmailHash,
      email: parsed.email,
    })
  ) {
    throw new Error(GENERIC_LOOKUP_ERROR)
  }

  await setBookingLookupAccessCookie({
    bookingReference: order.bookingReference,
    contactEmailHash: order.contactEmailHash,
  })

  logFlightFlow("orders.lookup", "lookup_succeeded", {
    bookingReference: order.bookingReference,
  })

  return {
    bookingReference: order.bookingReference,
  }
}

export async function getBookingDetail(
  input: {
    reference: string
    actor: ActorContext
    refreshFromDuffel?: boolean
  },
  deps: OrdersServiceDeps = defaultDeps
) {
  const parsed = bookingDetailInputSchema.parse({
    reference: input.reference,
  })
  const order = await deps.orderRepository.findByBookingReference(parsed.reference)

  if (!order) {
    throw new Error("Booking not found.")
  }

  const ownerAllowed =
    input.actor.type === "user"
      ? order.ownerUserId === input.actor.appUserId
      : input.actor.guestId !== GUEST_UNAVAILABLE_ID &&
        order.ownerGuestId === input.actor.guestId
  const guestLookupAllowed = await canGuestAccessBooking({
    bookingReference: order.bookingReference,
    contactEmailHash: order.contactEmailHash,
  })

  if (!ownerAllowed && !guestLookupAllowed) {
    throw new Error("Booking access denied.")
  }

  const [checkoutSession, notifications] = await Promise.all([
    deps.checkoutSessionRepository.findById(order.checkoutSessionId),
    deps.notificationOutboxRepository.listRecentByFlightOrderId({
      flightOrderId: order.id,
      limit: 20,
    }),
  ])

  const bookingNotifications = notifications.filter(
    (notification): notification is typeof notification & {
      eventType: "booking_confirmed" | "hold_created" | "reconciliation_required"
    } =>
      notification.eventType === "booking_confirmed" ||
      notification.eventType === "hold_created" ||
      notification.eventType === "reconciliation_required"
  )

  const detail = mapFlightOrderToDetailModel(order, {
    checkoutSession,
    notifications: bookingNotifications,
  })

  if (input.refreshFromDuffel) {
    try {
      const liveOrder = await deps.getDuffelOrderById(order.duffelOrderId)

      if (liveOrder) {
        logFlightFlow("orders.detail", "duffel_refresh_loaded", {
          bookingReference: order.bookingReference,
          duffelOrderId: liveOrder.id,
        })
      }
    } catch (error) {
      logFlightFlowError("orders.detail", "duffel_refresh_failed", error, {
        bookingReference: order.bookingReference,
      })
    }
  }

  return detail
}

export async function getBookingForNotification(
  input: { bookingReference: string },
  deps: OrdersServiceDeps = defaultDeps
) {
  const parsed = bookingDetailInputSchema.parse({
    reference: input.bookingReference,
  })
  const order = await deps.orderRepository.findByBookingReference(parsed.reference)

  if (!order) {
    return null
  }

  return {
    bookingReference: order.bookingReference,
    recipientEmail: order.contactEmail,
    recipientEmailHash: createEmailHash(order.contactEmail),
    detail: mapFlightOrderToDetailModel(order),
  }
}
