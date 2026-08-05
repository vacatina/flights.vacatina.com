"use client"

import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { CheckoutWizardStep } from "@/modules/flights/checkout/domain"

const STEP_LABELS: Record<CheckoutWizardStep, string> = {
  traveler: "Traveler details",
  extras: "Extras",
  pay: "Review and pay",
}

interface CheckoutWizardShellProps {
  currentStep: CheckoutWizardStep
  onStepChange: (step: CheckoutWizardStep) => void
  canNavigateToStep?: (step: CheckoutWizardStep) => boolean
  travelerComplete?: boolean
  extrasComplete?: boolean
  children: React.ReactNode
}

const STEP_ORDER: CheckoutWizardStep[] = ["traveler", "extras", "pay"]

export function CheckoutWizardShell({
  currentStep,
  onStepChange,
  canNavigateToStep,
  travelerComplete = false,
  extrasComplete = false,
  children,
}: CheckoutWizardShellProps) {
  function stepComplete(step: CheckoutWizardStep) {
    if (step === "traveler") {
      return travelerComplete
    }

    if (step === "extras") {
      return extrasComplete
    }

    return false
  }

  return (
    <div className="space-y-5">
      <nav aria-label="Checkout steps" className="rounded-xl border border-border bg-card p-2 shadow-sm">
        <ol className="grid gap-2 sm:grid-cols-3">
          {STEP_ORDER.map((step) => {
            const enabled = canNavigateToStep ? canNavigateToStep(step) : true
            const active = step === currentStep
            const complete = stepComplete(step)
            const Icon = complete ? CheckCircle2Icon : AlertCircleIcon

            return (
              <li key={step}>
                <button
                  type="button"
                  disabled={!enabled}
                  aria-current={active ? "step" : undefined}
                  onClick={() => onStepChange(step)}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/40",
                    !enabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      complete && !active ? "text-primary" : ""
                    )}
                  />
                  {STEP_LABELS[step]}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div>{children}</div>
    </div>
  )
}
