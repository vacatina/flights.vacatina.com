import "server-only"
import type { CreateOrderChangeRequest, Order, OrderChange, OrderChangeOffer, OrderChangeRequestResponse } from "@duffel/api/types"
import { getDuffelClient } from "@/lib/duffel"

export interface ChangeMoney { amount:number; currency:string }
export interface DuffelChangeOfferResult { id:string; changeTotal:ChangeMoney; newTotal:ChangeMoney|null; penalty:ChangeMoney|null; refundTo:string|null; expiresAt:Date; summary:Record<string,unknown>; rawPayload:unknown }
export interface DuffelPendingChangeResult extends DuffelChangeOfferResult { orderChangeId:string; selectedOfferId:string; confirmedAt:Date|null }
export interface DuffelLiveOrderResult { id:string; availableActions:string[]; slices:Array<{id:string;changeable:boolean;origin:string;destination:string;departureAt:Date|null}>; rawPayload:Order }
export interface DuffelChangeAdapter {
  getOrder(id:string):Promise<DuffelLiveOrderResult>
  createChangeRequest(input:{orderId:string;removedSliceIds:string[];criteria:Array<{origin:string;destination:string;departureDate:string;cabinClass:"first"|"business"|"premium_economy"|"economy"}>}):Promise<{id:string;offers:DuffelChangeOfferResult[];rawPayload:unknown}>
  getChangeRequest(id:string):Promise<{id:string;offers:DuffelChangeOfferResult[];rawPayload:unknown}>
  getOffer(id:string):Promise<DuffelChangeOfferResult>
  createPendingChange(offerId:string):Promise<DuffelPendingChangeResult>
  getPendingChange(id:string):Promise<DuffelPendingChangeResult>
  confirmPendingChange(id:string,input:{amount:number;currency:string}):Promise<DuffelPendingChangeResult>
  getAvailableServices?(orderId:string):Promise<unknown[]>
  addServices?(orderId:string,services:Array<{id:string;quantity:number}>):Promise<unknown>
}

export const defaultDuffelChangeAdapter:DuffelChangeAdapter={
  async getOrder(id){return mapOrder((await getDuffelClient().orders.get(id)).data)},
  async createChangeRequest(input){const payload:CreateOrderChangeRequest={order_id:input.orderId,slices:{remove:input.removedSliceIds.map(slice_id=>({slice_id})),add:input.criteria.map(c=>({origin:c.origin,destination:c.destination,departure_date:c.departureDate,cabin_class:c.cabinClass}))}};return mapRequest((await getDuffelClient().orderChangeRequests.create(payload)).data)},
  async getChangeRequest(id){return mapRequest((await getDuffelClient().orderChangeRequests.get(id)).data)},
  async getOffer(id){return mapDuffelChangeOffer((await getDuffelClient().orderChangeOffers.get(id)).data)},
  async createPendingChange(offerId){return mapDuffelPendingChange((await getDuffelClient().orderChanges.create({selected_order_change_offer:offerId})).data as unknown as OrderChange,offerId)},
  async getPendingChange(id){return mapDuffelPendingChange((await getDuffelClient().orderChanges.get(id)).data as unknown as OrderChange)},
  async confirmPendingChange(id,input){const options=input.amount>0?{payment:{amount:input.amount.toFixed(2),currency:input.currency,type:"balance" as const}}:{};return mapDuffelPendingChange((await getDuffelClient().orderChanges.confirm(id,options)).data as unknown as OrderChange)},
  async getAvailableServices(orderId){return ((await (getDuffelClient().orders as unknown as {getAvailableServices:(id:string)=>Promise<{data:unknown[]}>}).getAvailableServices(orderId)).data)??[]},
  async addServices(orderId,services){return (await (getDuffelClient().orders as unknown as {addServices:(id:string,payload:{services:Array<{id:string;quantity:number}>})=>Promise<{data:unknown}>}).addServices(orderId,{services})).data},
}

export function assertLiveSlicesEligible(order:DuffelLiveOrderResult,selectedIds:string[],now=new Date()){
  const selected=selectedIds.map(id=>order.slices.find(s=>s.id===id));
  if(selected.some(s=>!s)) throw new Error("A selected journey is no longer part of this order.")
  if(selected.some(s=>!s!.changeable)) throw new Error("The airline does not support an automatic change for the selected journey.")
  if(selected.some(s=>s!.departureAt&&s!.departureAt!.getTime()<=now.getTime())) throw new Error("A departed journey cannot be changed automatically.")
}
export function assertPendingChangeMatches(input:{pending:DuffelPendingChangeResult;expectedAmount:number;expectedCurrency:string;now?:Date}){
  if(input.pending.confirmedAt) throw new Error("This flight change has already been confirmed.")
  if(input.pending.expiresAt.getTime()<=(input.now??new Date()).getTime()) throw new Error("This flight change quote has expired.")
  if(input.pending.changeTotal.currency!==input.expectedCurrency.toUpperCase()) throw new Error("The flight change currency changed. Review the latest quote.")
  if(Math.abs(input.pending.changeTotal.amount-input.expectedAmount)>0.0001) throw new Error("The flight change price changed. Review the latest quote.")
}
export function isExpired(expiresAt:Date,now=new Date()){return expiresAt.getTime()<=now.getTime()}

function mapRequest(r:OrderChangeRequestResponse){return {id:r.id,offers:r.order_change_offers.map(o=>mapDuffelChangeOffer(o as unknown as OrderChangeOffer)),rawPayload:r}}
export function mapDuffelChangeOffer(o:OrderChangeOffer):DuffelChangeOfferResult {const currency=requireCurrency(o.change_total_currency??o.new_total_currency);return {id:o.id,changeTotal:{amount:requireAmount(o.change_total_amount),currency},newTotal:o.new_total_amount===null?null:{amount:requireAmount(o.new_total_amount),currency:requireCurrency(o.new_total_currency)},penalty:o.penalty_amount===null?null:{amount:requireAmount(o.penalty_amount),currency:requireCurrency(o.penalty_currency)},refundTo:o.refund_to??null,expiresAt:requireDate(o.expires_at),summary:{slices:o.slices,operatingCarriers:operatingCarriers(o)},rawPayload:o}}
export function mapDuffelPendingChange(o:OrderChange,selectedOfferId=""):DuffelPendingChangeResult {const offer=mapDuffelChangeOffer(o as unknown as OrderChangeOffer);return {...offer,id:o.id,orderChangeId:o.id,selectedOfferId:selectedOfferId||readString(o,"selected_order_change_offer")||"",confirmedAt:optionalDate(o.confirmed_at),penalty:o.penalty_total_amount===null?null:{amount:requireAmount(o.penalty_total_amount),currency:requireCurrency(o.penalty_total_currency)}}}
function mapOrder(o:Order):DuffelLiveOrderResult {const raw=o as unknown as Record<string,unknown>;const slices=Array.isArray(raw.slices)?raw.slices:[];return {id:o.id,availableActions:Array.isArray(o.available_actions)?o.available_actions:[],slices:slices.map(value=>{const s=value as Record<string,unknown>,segments=Array.isArray(s.segments)?s.segments:[],first=(segments[0]??{}) as Record<string,unknown>;return {id:String(s.id??""),changeable:s.changeable===true,origin:placeCode(s.origin),destination:placeCode(s.destination),departureAt:optionalDate(typeof first.departing_at==="string"?first.departing_at:null)}}),rawPayload:o}}
function operatingCarriers(o:OrderChangeOffer){return [...new Set(o.slices.add.flatMap(s=>s.segments.map(x=>x.operating_carrier?.name).filter((x):x is string=>Boolean(x))))]}
function placeCode(value:unknown){if(!value||typeof value!=="object")return "";const v=value as Record<string,unknown>;return typeof v.iata_code==="string"?v.iata_code:""}
function requireAmount(value:string|null){const amount=Number(value);if(!Number.isFinite(amount))throw new Error("Duffel returned an invalid change amount.");return amount}
function requireCurrency(value:string|null|undefined){if(!value||!/^[A-Z]{3}$/i.test(value))throw new Error("Duffel returned an invalid change currency.");return value.toUpperCase()}
function requireDate(value:string){const date=optionalDate(value);if(!date)throw new Error("Duffel returned an invalid change expiry.");return date}
function optionalDate(value:string|null|undefined){if(!value)return null;const date=new Date(value);return Number.isFinite(date.getTime())?date:null}
function readString(value:unknown,key:string){if(!value||typeof value!=="object")return null;const item=(value as Record<string,unknown>)[key];return typeof item==="string"?item:null}
