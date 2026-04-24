"use client"

import { cn } from "@/lib/utils"
import type { CheckoutWizardStep } from "@/modules/flights/checkout/domain"

const STEP_LABELS: Record<CheckoutWizardStep, string> = {
  traveler: "Traveler details",
  extras: "Extras",
  pay: "Pay",
}

interface CheckoutWizardShellProps {
  currentStep: CheckoutWizardStep
  onStepChange: (step: CheckoutWizardStep) => void
  canNavigateToStep?: (step: CheckoutWizardStep) => boolean
  children: React.ReactNode
}

const STEP_ORDER: CheckoutWizardStep[] = ["traveler", "extras", "pay"]

export function CheckoutWizardShell({
  currentStep,
  onStepChange,
  canNavigateToStep,
  children,
}: CheckoutWizardShellProps) {
  return (
    <div className="space-y-5">
      <nav aria-label="Checkout steps" className="rounded-2xl border bg-card/80 p-2">
        <ol className="grid gap-2 sm:grid-cols-3">
          {STEP_ORDER.map((step) => {
            const enabled = canNavigateToStep ? canNavigateToStep(step) : true
            const active = step === currentStep

            return (
              <li key={step}>
                <button
                  type="button"
                  disabled={!enabled}
                  aria-current={active ? "step" : undefined}
                  onClick={() => onStepChange(step)}
                  className={cn(
                    "flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/70",
                    !enabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
                  )}
                >
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
