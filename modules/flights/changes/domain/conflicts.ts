import type { FlightCancellationStatus } from "@/modules/flights/cancellations/domain"
import { isActiveCancellationStatus } from "@/modules/flights/cancellations/domain"
import type { FlightChangeStatus } from "@/modules/flights/changes/domain/types"
import { isActiveChangeStatus } from "@/modules/flights/changes/domain/types"

export function assertNoActiveBookingMutation(input: { cancellationStatus?: FlightCancellationStatus | null; changeStatus?: FlightChangeStatus | null; ignoreChangeRequest?: boolean }) {
  if (input.cancellationStatus && isActiveCancellationStatus(input.cancellationStatus)) throw new Error("A cancellation is already in progress for this booking.")
  if (!input.ignoreChangeRequest && input.changeStatus && isActiveChangeStatus(input.changeStatus)) throw new Error("Another flight change is already in progress for this booking.")
}

export function getPassengerRemovalWarnings(input: { selectedPassengerIds: string[]; passengers: Array<{ id: string; typeLabel: string }> }) {
  const selected = new Set(input.selectedPassengerIds)
  const removingAdult = input.passengers.some(p => selected.has(p.id) && p.typeLabel.toLowerCase().includes("adult"))
  const retainedInfant = input.passengers.some(p => !selected.has(p.id) && p.typeLabel.toLowerCase().includes("infant"))
  return removingAdult && retainedInfant ? ["An infant without a seat may be linked to the selected adult. An administrator must review both travellers."] : []
}

