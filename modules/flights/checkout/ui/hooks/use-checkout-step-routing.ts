"use client"

import { useRouter } from "next/navigation"

import {
  toCheckoutUrlSearchParams,
  type CheckoutUrlState,
  type CheckoutWizardStep,
} from "@/modules/flights/checkout/domain"

const STEP_ORDER: CheckoutWizardStep[] = ["traveler", "extras", "pay"]

export function useCheckoutStepRouting(input: {
  partialOfferRequestId: string
  state: CheckoutUrlState
}) {
  const router = useRouter()
  const currentStep = input.state.step
  const currentIndex = STEP_ORDER.indexOf(currentStep)

  function navigateStep(step: CheckoutWizardStep) {
    const params = toCheckoutUrlSearchParams({
      ...input.state,
      step,
    })
    router.replace(`/results/${input.partialOfferRequestId}/checkout?${params.toString()}`)
  }

  function goNextStep() {
    const nextStep = STEP_ORDER[Math.min(currentIndex + 1, STEP_ORDER.length - 1)]
    navigateStep(nextStep)
  }

  function goPreviousStep() {
    const previousStep = STEP_ORDER[Math.max(currentIndex - 1, 0)]
    navigateStep(previousStep)
  }

  return {
    currentStep,
    isFirstStep: currentIndex <= 0,
    isLastStep: currentIndex >= STEP_ORDER.length - 1,
    stepOrder: STEP_ORDER,
    navigateStep,
    goNextStep,
    goPreviousStep,
  }
}

