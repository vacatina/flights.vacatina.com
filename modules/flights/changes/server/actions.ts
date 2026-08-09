"use server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getActorContext } from "@/modules/auth/server"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server/admin-guard"
import { flightChangeRequestTypes, type FlightChangeRequestType } from "@/modules/flights/changes/domain"
import { createManualChangeRequest, searchItineraryChanges, selectChangeOffer, confirmZeroPriceChange, performAdminChangeAction } from "@/modules/flights/changes/server/service"
import { captureFlightChangePayPalPayment, startFlightChangePayPalPayment } from "@/modules/flights/payments-adapter/change-payment-service"

export async function createManualChangeRequestAction(formData:FormData){
  const actor=await getActorContext({ensureGuestSession:false})
  const bookingReference=req(formData,"bookingReference")
  const selectedPassengerIds=formData.getAll("passengerId").filter((v):v is string=>typeof v==="string")
  const result=await createManualChangeRequest({actor,bookingReference,requestType:parseRequestType(req(formData,"requestType")),customerReason:req(formData,"reason"),selectedPassengerIds,selectedSliceIds:[],requestedChange:{details:opt(formData,"details")}})
  revalidatePath(`/booking/${bookingReference}`)
  redirect(`/booking/${encodeURIComponent(bookingReference)}/change/${result.id}`)
}
export async function searchItineraryChangesAction(formData:FormData){
  const actor=await getActorContext({ensureGuestSession:false}),bookingReference=req(formData,"bookingReference"),sliceId=req(formData,"sliceId")
  const result=await searchItineraryChanges({actor,bookingReference,selectedSliceIds:[sliceId],criteria:[{origin:req(formData,"origin"),destination:req(formData,"destination"),departureDate:req(formData,"departureDate"),cabinClass:parseCabin(req(formData,"cabinClass"))}]})
  redirect(`/booking/${encodeURIComponent(bookingReference)}/change/${result.request.id}/${result.offers.length?"offers":""}`.replace(/\/$/,""))
}
export async function selectChangeOfferAction(formData:FormData){const actor=await getActorContext({ensureGuestSession:false}),bookingReference=req(formData,"bookingReference"),requestId=req(formData,"requestId");await selectChangeOffer({actor,requestId,offerId:req(formData,"offerId")});redirect(`/booking/${encodeURIComponent(bookingReference)}/change/${requestId}/review`)}
export async function confirmZeroPriceChangeAction(formData:FormData){const actor=await getActorContext({ensureGuestSession:false}),bookingReference=req(formData,"bookingReference"),requestId=req(formData,"requestId");await confirmZeroPriceChange({actor,requestId});revalidatePath(`/booking/${bookingReference}`);redirect(`/booking/${encodeURIComponent(bookingReference)}/change/${requestId}`)}
export async function startFlightChangePayPalPaymentAction(input:{requestId:string}){const actor=await getActorContext({ensureGuestSession:false});return startFlightChangePayPalPayment({requestId:input.requestId,actor})}
export async function captureFlightChangePayPalPaymentAction(input:{requestId:string;paypalOrderId:string;bookingReference:string}){const actor=await getActorContext({ensureGuestSession:false});const result=await captureFlightChangePayPalPayment({requestId:input.requestId,paypalOrderId:input.paypalOrderId,actor});revalidatePath(`/booking/${input.bookingReference}`);revalidatePath(`/booking/${input.bookingReference}/change/${input.requestId}`);return result}
export async function adminChangeAction(formData:FormData){const admin=await requireActiveAdmin(),requestId=req(formData,"requestId");await performAdminChangeAction({admin,requestId,action:parseAdminAction(req(formData,"action")),reason:opt(formData,"reason"),externalReference:opt(formData,"externalReference"),customerMessage:opt(formData,"customerMessage")});revalidatePath("/admin/changes");revalidatePath(`/admin/changes/${requestId}`)}
function req(data:FormData,key:string){const value=data.get(key);if(typeof value!=="string"||!value.trim())throw new Error(`${key} is required.`);return value.trim()}
function opt(data:FormData,key:string){const value=data.get(key);return typeof value==="string"&&value.trim()?value.trim():undefined}
function parseRequestType(value:string):FlightChangeRequestType{if(flightChangeRequestTypes.includes(value as FlightChangeRequestType))return value as FlightChangeRequestType;throw new Error("Invalid flight change request type.")}
function parseCabin(value:string){if(value==="first"||value==="business"||value==="premium_economy"||value==="economy")return value;throw new Error("Invalid cabin class.")}
function parseAdminAction(value:string){if(value==="approve"||value==="reject"||value==="manual"||value==="complete")return value;throw new Error("Invalid admin action.")}
