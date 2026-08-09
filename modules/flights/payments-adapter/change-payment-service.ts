import "server-only"

import type { ActorContext } from "@/modules/auth/types"
import { getChangeStatus } from "@/modules/flights/changes/server/service"
import { defaultChangeRepository, type ChangeRepository } from "@/modules/flights/changes/server/repository"
import { defaultPaymentAttemptsRepository, type PaymentAttemptsRepository } from "@/modules/payments/server/attempts-repository"
import { defaultPaymentEventsRepository, type PaymentEventsRepository } from "@/modules/payments/server/events-repository"
import { defaultPaymentOutboxRepository, type PaymentOutboxRepository } from "@/modules/payments/server/outbox-repository"
import { createPaymentAttemptId, createPaymentEventId, createPaymentOutboxId } from "@/modules/payments/server/ids"
import type { PaymentInternalOrderType, PaymentEventType } from "@/modules/payments/domain"
import { capturePayPalOrder, createPayPalOrder, getPayPalCaptureFromOrder } from "@/modules/payments/server/providers/paypal"

type ChangePayableType = "flight_change" | "flight_post_booking_service"

interface Deps {
  changes: ChangeRepository
  attempts: PaymentAttemptsRepository
  events: PaymentEventsRepository
  outbox: PaymentOutboxRepository
  createProviderOrder: typeof createPayPalOrder
  captureProviderOrder: typeof capturePayPalOrder
}

const defaultDeps: Deps = { changes: defaultChangeRepository, attempts: defaultPaymentAttemptsRepository, events: defaultPaymentEventsRepository, outbox: defaultPaymentOutboxRepository, createProviderOrder: createPayPalOrder, captureProviderOrder: capturePayPalOrder }

export async function startFlightChangePayPalPayment(input:{requestId:string;actor:ActorContext},deps=defaultDeps){
  const status=await getChangeStatus({requestId:input.requestId,actor:input.actor})
  const request=await deps.changes.findRequestById(input.requestId)
  if(!request||request.status!=="payment_pending"||!request.additionalPaymentAmount||!request.currency)throw new Error("This change is not ready for payment.")
  const resourceType=resourceForRequest(request.requestType)
  const existing=request.paymentAttemptId?await deps.attempts.findById(request.paymentAttemptId):null
  if(existing?.providerOrderId)return {paymentAttemptId:existing.id,paypalOrderId:existing.providerOrderId,amount:existing.amount,currency:existing.currency}
  const attempt=await deps.attempts.createOrFindByIdempotency({
    id:createPaymentAttemptId(),
    // The payment module currently narrows this union to checkout. Keep the runtime
    // resource types at the flight boundary until the shared module is widened.
    internalOrderType:resourceType as PaymentInternalOrderType,
    internalOrderId:request.id,
    ownerUserId:request.requestedByUserId,ownerGuestId:request.requestedByGuestId,ownerOrgId:null,
    provider:"paypal",status:"created",currency:request.currency,amount:request.additionalPaymentAmount,
    createIdempotencyKey:`paypal:create:flight-change:${request.id}`,
    captureIdempotencyKey:`paypal:capture:flight-change:${request.id}`,
    clientIdempotencyKey:`flight-change:${request.id}`,
    checkoutPayloadSnapshot:{kind:resourceType,changeRequestId:request.id},
  })
  const providerOrder=await deps.createProviderOrder({checkoutSessionId:request.id,partialOfferRequestId:"flight-change",quoteId:request.id,offerId:request.id,amount:attempt.amount,currency:attempt.currency,contactEmail:status.booking.customerEmail})
  const updated=await deps.attempts.update(attempt.id,{status:"provider_order_created",providerOrderId:providerOrder.id,providerStatus:providerOrder.status??"CREATED"})
  await deps.changes.updateRequest(request.id,{paymentAttemptId:attempt.id})
  await appendEvent(deps,updated??attempt,"PAYMENT_INITIATED")
  await appendEvent(deps,updated??attempt,"PROVIDER_ORDER_CREATED")
  return {paymentAttemptId:attempt.id,paypalOrderId:providerOrder.id,amount:attempt.amount,currency:attempt.currency}
}

export async function captureFlightChangePayPalPayment(input:{requestId:string;paypalOrderId:string;actor:ActorContext},deps=defaultDeps){
  await getChangeStatus({requestId:input.requestId,actor:input.actor})
  const request=await deps.changes.findRequestById(input.requestId)
  if(!request?.paymentAttemptId)throw new Error("A payment has not been started for this change.")
  const attempt=await deps.attempts.findById(request.paymentAttemptId)
  if(!attempt||attempt.internalOrderId!==request.id||attempt.providerOrderId!==input.paypalOrderId)throw new Error("PayPal order does not match this flight change.")
  if(attempt.status==="fulfilled")return {status:"fulfilled" as const,paymentAttemptId:attempt.id}
  await appendEvent(deps,attempt,"BUYER_APPROVED")
  await appendEvent(deps,attempt,"CAPTURE_REQUESTED")
  await deps.attempts.update(attempt.id,{status:"capture_pending"})
  const captured=await deps.captureProviderOrder(input.paypalOrderId),capture=getPayPalCaptureFromOrder(captured)
  if(!capture?.id||capture.status!=="COMPLETED")throw new Error("PayPal did not complete the payment capture.")
  const updated=await deps.attempts.update(attempt.id,{status:"capture_completed",providerCaptureId:capture.id,providerStatus:capture.status,lastProviderPayload:captured})
  await appendEvent(deps,updated??attempt,"CAPTURE_COMPLETED")
  await deps.outbox.enqueueUnique({id:createPaymentOutboxId(),taskType:"fulfill_paid_resource",uniqueKey:`fulfill_paid_resource:${attempt.id}`,paymentAttemptId:attempt.id,internalOrderType:attempt.internalOrderType,internalOrderId:request.id,payload:{provider:"paypal",providerPaymentId:capture.id,source:"flight_change_capture"}})
  return {status:"processing" as const,paymentAttemptId:attempt.id}
}

function resourceForRequest(type:string):ChangePayableType { if(type==="itinerary_change")return "flight_change"; if(type==="add_baggage")return "flight_post_booking_service"; throw new Error("This change type cannot be paid automatically.") }
async function appendEvent(deps:Deps,attempt:Awaited<ReturnType<PaymentAttemptsRepository["findById"]>> extends infer T?Exclude<T,null>:never,eventType:PaymentEventType){const events=await deps.events.listByAttemptId(attempt.id);if(events.some(event=>event.eventType===eventType))return;await deps.events.append({id:createPaymentEventId(),paymentAttemptId:attempt.id,eventType,provider:attempt.provider,providerOrderId:attempt.providerOrderId,providerCaptureId:attempt.providerCaptureId,amount:attempt.amount,currency:attempt.currency})}
