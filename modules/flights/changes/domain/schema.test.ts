import { describe,expect,test } from "vitest"
import { assertChangeStatusTransition, assertNoActiveBookingMutation, createFlightChangeRequestSchema, getPassengerRemovalWarnings, getPricingDirection, statusForPendingAmount } from "@/modules/flights/changes/domain"

describe("flight change domain",()=>{
  test("validates request-specific selections and excludes Phase 1 baggage purchase",()=>{
    expect(()=>createFlightChangeRequestSchema.parse({bookingReference:"ABC123",requestType:"remove_passenger",customerReason:"Cannot travel",selectedPassengerIds:[],selectedSliceIds:[]})).toThrow(/traveller/i)
    expect(()=>createFlightChangeRequestSchema.parse({bookingReference:"ABC123",requestType:"add_baggage",customerReason:"Need a bag",selectedPassengerIds:[],selectedSliceIds:[]})).toThrow(/Phase 1/i)
  })
  test("routes final prices safely",()=>{
    expect(getPricingDirection(25)).toBe("additional_payment")
    expect(getPricingDirection(0)).toBe("no_difference")
    expect(getPricingDirection(-12)).toBe("customer_refund")
    expect(statusForPendingAmount(25)).toBe("payment_pending")
    expect(statusForPendingAmount(-1)).toBe("admin_review_required")
  })
  test("enforces transitions and booking mutation conflicts",()=>{
    expect(()=>assertChangeStatusTransition("completed","searching")).toThrow()
    expect(()=>assertNoActiveBookingMutation({cancellationStatus:"requested"})).toThrow(/cancellation/i)
    expect(()=>assertNoActiveBookingMutation({changeStatus:"payment_pending"})).toThrow(/change/i)
  })
  test("warns when an adult removal can orphan an infant",()=>{
    expect(getPassengerRemovalWarnings({selectedPassengerIds:["adult"],passengers:[{id:"adult",typeLabel:"Adult"},{id:"infant",typeLabel:"Infant without seat"}]})).toHaveLength(1)
  })
})

