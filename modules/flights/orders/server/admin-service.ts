import "server-only"

import type { FlightCancellationStatus } from "@/modules/flights/cancellations/domain"
import {
  defaultCancellationRepository,
  type CancellationRepository,
} from "@/modules/flights/cancellations/server/repository"
import { getCustomerBookingStatus } from "@/modules/flights/cancellations/ui/status-presentation"
import {
  defaultFlightOrderRepository,
  listAdminFlightOrders,
  type AdminBookingStatusFilter,
  type FlightOrderRepository,
} from "@/modules/flights/checkout/server/order-repository"
import {
  defaultCheckoutSessionRepository,
  type CheckoutSessionRepository,
} from "@/modules/flights/checkout/server/session-repository"
import {
  mapFlightOrderToDetailModel,
  mapFlightOrderToListItem,
} from "@/modules/flights/orders/domain"
import type { AdminBookingListQuery } from "@/modules/flights/orders/domain/admin-schema"
import { defaultChangeRepository, type ChangeRepository } from "@/modules/flights/changes/server/repository"
import {
  defaultNotificationOutboxRepository,
  type NotificationOutboxRepository,
} from "@/modules/notifications/server/outbox-repository"

interface AdminBookingsServiceDeps {
  listOrders: typeof listAdminFlightOrders
  orderRepository: Pick<FlightOrderRepository, "findByBookingReference">
  checkoutSessionRepository: Pick<CheckoutSessionRepository, "findById">
  notificationOutboxRepository: Pick<
    NotificationOutboxRepository,
    "listRecentByFlightOrderId"
  >
  cancellationRepository: Pick<
    CancellationRepository,
    "findLatestRequestByFlightOrderId"
  >
  changeRepository?: Pick<ChangeRepository, "findLatestByFlightOrderId">
}

const defaultDeps: AdminBookingsServiceDeps = {
  listOrders: listAdminFlightOrders,
  orderRepository: defaultFlightOrderRepository,
  checkoutSessionRepository: defaultCheckoutSessionRepository,
  notificationOutboxRepository: defaultNotificationOutboxRepository,
  cancellationRepository: defaultCancellationRepository,
  changeRepository: defaultChangeRepository,
}

export interface AdminBookingListItem {
  bookingReference: string
  customerEmail: string
  routeLabel: string
  journeyTypeLabel: string
  passengerCount: number
  airlineName: string
  airlineLogoSymbolUrl: string | null
  airlineBookingReference: string | null
  departureDateLabel: string | null
  createdAtLabel: string
  statusLabel: string
  statusTone: "active" | "cancelled" | "pending" | "attention"
  paymentLabel: string
  paymentMode: "pay_now" | "hold"
  sellAmountLabel: string
  cancellationStatus: FlightCancellationStatus | null
  cancellationRequestId: string | null
}

export interface AdminBookingDetailModel {
  booking: ReturnType<typeof mapFlightOrderToDetailModel>
  operationalStatus: {
    label: string
    description: string | null
    tone: "active" | "cancelled" | "pending" | "attention"
  }
  cancellation: {
    requestId: string
    status: FlightCancellationStatus
    customerReason: string
    customerMessage: string | null
    refundAmountLabel: string | null
    updatedAtLabel: string
  } | null
  changes: Array<{ requestId:string; status:string; requestType:string; pricingDirection:string; updatedAtLabel:string }>
  identifiers: {
    flightOrderId: string
    checkoutSessionId: string
    duffelOrderId: string
    partialOfferRequestId: string
    offerId: string
    ownerUserId: string | null
    ownerGuestId: string | null
  }
}

export async function listAdminBookings(
  query: AdminBookingListQuery,
  deps: AdminBookingsServiceDeps = defaultDeps
) {
  const result = await deps.listOrders({
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
    q: query.q,
    status: query.status as AdminBookingStatusFilter,
    sort: query.sort,
  })

  const items: AdminBookingListItem[] = result.records.map((record) => {
    const item = mapFlightOrderToListItem(record.order, {
      cancellationStatus: record.cancellationStatus,
    })
    const operationalStatus = getCustomerBookingStatus({
      bookingStatusLabel: item.statusLabel,
      cancellationStatus: record.cancellationStatus,
    })
    const snapshot = record.order.orderSnapshot

    return {
      bookingReference: item.bookingReference,
      customerEmail: record.order.contactEmail,
      routeLabel: item.routeLabel,
      journeyTypeLabel: item.journeyTypeLabel,
      passengerCount: item.passengerCount,
      airlineName: item.airlineName,
      airlineLogoSymbolUrl: item.airlineLogoSymbolUrl,
      airlineBookingReference:
        typeof snapshot.airlineBookingReference === "string"
          ? snapshot.airlineBookingReference
          : null,
      departureDateLabel: item.departureDateLabel,
      createdAtLabel: item.createdAtLabel,
      statusLabel: operationalStatus.label,
      statusTone: operationalStatus.tone,
      paymentLabel: toPaymentLabel(record.order),
      paymentMode: record.order.paymentMode,
      sellAmountLabel: item.sellAmountLabel,
      cancellationStatus: record.cancellationStatus,
      cancellationRequestId: record.cancellationRequestId,
    }
  })

  return {
    ...query,
    total: result.total,
    pageCount: Math.max(1, Math.ceil(result.total / query.pageSize)),
    items,
  }
}

export async function getAdminBookingDetail(
  bookingReference: string,
  deps: AdminBookingsServiceDeps = defaultDeps
): Promise<AdminBookingDetailModel | null> {
  const normalizedReference = bookingReference.trim().toUpperCase()
  const order = await deps.orderRepository.findByBookingReference(
    normalizedReference
  )

  if (!order) {
    return null
  }

  const [checkoutSession, notifications, cancellation, change] = await Promise.all([
    deps.checkoutSessionRepository.findById(order.checkoutSessionId),
    deps.notificationOutboxRepository.listRecentByFlightOrderId({
      flightOrderId: order.id,
      limit: 20,
    }),
    deps.cancellationRepository.findLatestRequestByFlightOrderId(order.id),
    deps.changeRepository?.findLatestByFlightOrderId(order.id) ?? null,
  ])
  const bookingNotifications = notifications.filter(
    (notification): notification is typeof notification & {
      eventType:
        | "booking_confirmed"
        | "hold_created"
        | "reconciliation_required"
    } =>
      notification.eventType === "booking_confirmed" ||
      notification.eventType === "hold_created" ||
      notification.eventType === "reconciliation_required"
  )
  const booking = mapFlightOrderToDetailModel(order, {
    checkoutSession,
    notifications: bookingNotifications,
  })
  const operationalStatus = getCustomerBookingStatus({
    bookingStatusLabel: booking.statusLabel,
    cancellationStatus: cancellation?.status,
  })

  return {
    booking,
    operationalStatus,
    cancellation: cancellation
      ? {
          requestId: cancellation.id,
          status: cancellation.status,
          customerReason: cancellation.customerReason,
          customerMessage: cancellation.customerMessage,
          refundAmountLabel:
            cancellation.customerRefundAmount !== null &&
            cancellation.customerRefundCurrency
              ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: cancellation.customerRefundCurrency,
                }).format(cancellation.customerRefundAmount)
              : null,
          updatedAtLabel: new Intl.DateTimeFormat("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(cancellation.updatedAt),
        }
      : null,
    changes: change ? [{ requestId:change.id,status:change.status,requestType:change.requestType,pricingDirection:change.pricingDirection,updatedAtLabel:new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(change.updatedAt) }] : [],
    identifiers: {
      flightOrderId: order.id,
      checkoutSessionId: order.checkoutSessionId,
      duffelOrderId: order.duffelOrderId,
      partialOfferRequestId: order.partialOfferRequestId,
      offerId: order.offerId,
      ownerUserId: order.ownerUserId,
      ownerGuestId: order.ownerGuestId,
    },
  }
}

function toPaymentLabel(order: {
  paymentMode: "pay_now" | "hold"
  paymentAwaiting: boolean
  paidAt: Date | null
}) {
  if (order.paymentMode === "hold") {
    return "Pay later"
  }

  if (order.paymentAwaiting) {
    return "Payment pending"
  }

  return order.paidAt ? "Paid" : "Confirmed"
}
