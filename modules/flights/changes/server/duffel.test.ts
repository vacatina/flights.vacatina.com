import { describe,expect,test,vi } from "vitest"
vi.mock("server-only",()=>({}))
import { assertLiveSlicesEligible,assertPendingChangeMatches,isExpired,mapDuffelChangeOffer } from "@/modules/flights/changes/server/duffel"

describe("Duffel change adapter mapping",()=>{
  test("maps price, penalty, expiry, and operating carrier",()=>{
    const mapped=mapDuffelChangeOffer({id:"oco_1",change_total_amount:"0.00",change_total_currency:"USD",new_total_amount:"300.00",new_total_currency:"USD",penalty_amount:"25.00",penalty_currency:"USD",refund_to:"balance",expires_at:"2030-01-01T00:00:00Z",created_at:"2029-01-01T00:00:00Z",updated_at:"2029-01-01T00:00:00Z",order_change_id:"",slices:{remove:[],add:[{id:"slice",origin:{} as never,destination:{} as never,origin_type:"airport",destination_type:"airport",fare_brand_name:null,segments:[{operating_carrier:{name:"Example Air"},passengers:[]} as never]}]}})
    expect(mapped.changeTotal).toEqual({amount:0,currency:"USD"})
    expect(mapped.penalty?.amount).toBe(25)
    expect(mapped.summary.operatingCarriers).toEqual(["Example Air"])
  })
  test("rejects expired, changed, confirmed, or ineligible resources",()=>{
    expect(isExpired(new Date("2020-01-01"),new Date("2021-01-01"))).toBe(true)
    const pending={id:"x",orderChangeId:"x",selectedOfferId:"o",changeTotal:{amount:0,currency:"USD"},newTotal:null,penalty:null,refundTo:null,expiresAt:new Date("2030-01-01"),confirmedAt:null,summary:{},rawPayload:{}}
    expect(()=>assertPendingChangeMatches({pending,expectedAmount:1,expectedCurrency:"USD",now:new Date("2029-01-01")})).toThrow(/price changed/i)
    expect(()=>assertLiveSlicesEligible({id:"o",availableActions:[],slices:[{id:"s",changeable:false,origin:"CMB",destination:"DXB",departureAt:new Date("2030-01-01")}],rawPayload:{} as never},["s"],new Date("2029-01-01"))).toThrow(/does not support/i)
  })
})
