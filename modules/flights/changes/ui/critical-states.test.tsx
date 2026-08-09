import { render,screen } from "@testing-library/react"
import { describe,expect,test,vi } from "vitest"
vi.mock("server-only",()=>({}))
import { ChangeStatusPanel } from "@/modules/flights/changes/ui/change-status-panel"
describe("change critical states",()=>{test("explains Phase 2 payment pending without confirming",()=>{render(<ChangeStatusPanel detail={{request:{id:"r",status:"payment_pending",statusLabel:"Payment pending",customerMessage:null},booking:{reference:"ABC123"},pendingChange:null,events:[]}}/>);expect(screen.getByText(/PayPal change payments will be implemented in Phase 2/i)).toBeTruthy()});test("shows negative price admin review",()=>{render(<ChangeStatusPanel detail={{request:{id:"r",status:"admin_review_required",statusLabel:"Admin review required",customerMessage:null},booking:{reference:"ABC123"},pendingChange:null,events:[]}}/>);expect(screen.getByText(/will not be confirmed until an administrator reviews/i)).toBeTruthy()})})
