import { AlertCircleIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { VisaAssistanceResult } from "@/modules/visa-assistance/domain"
import { VisaDetailsHero } from "@/modules/visa-assistance/ui/visa-details-hero"
import { VisaDetailsSidebar } from "@/modules/visa-assistance/ui/visa-details-sidebar"
import { VisaNextStepsSection } from "@/modules/visa-assistance/ui/visa-next-steps-section"
import { VisaOptionsSection } from "@/modules/visa-assistance/ui/visa-options-section"

interface VisaDetailsProps {
  result: VisaAssistanceResult
}

export function VisaDetails({ result }: VisaDetailsProps) {
  return (
    <main className="bg-background">
      <VisaDetailsHero result={result} />

      <div className="border-t bg-muted/20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-14 lg:px-12 lg:py-20">
          <div className="flex min-w-0 flex-col gap-14 md:gap-16">
            <section aria-labelledby="requirement-summary-heading">
              <h2
                id="requirement-summary-heading"
                className="font-heading text-2xl font-semibold tracking-[-0.025em] md:text-3xl"
              >
                What this means for your trip
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {cleanVisibleText(
                  result.requirements.requirement_text ??
                    "Review the available document and entry rules before booking your trip."
                )}
              </p>
            </section>

            <VisaOptionsSection
              documents={result.eligibleDocuments}
              outcome={result.requirements.outcome}
            />

            <VisaNextStepsSection />

            <Alert className="rounded-2xl border-[#13357b]/15 bg-[#f1f5fa] text-foreground dark:border-border dark:bg-card">
              <AlertCircleIcon className="text-[#13357b] dark:text-blue-300" />
              <AlertTitle>Requirements can change</AlertTitle>
              <AlertDescription className="leading-relaxed">
                Confirm the latest rules with the destination’s embassy or
                immigration authority before booking or departure. Border
                officials make the final decision on entry.
              </AlertDescription>
            </Alert>
          </div>

          <VisaDetailsSidebar result={result} />
        </div>
      </div>
    </main>
  )
}

function cleanVisibleText(value: string) {
  return value.replace(/[\u2013\u2014]/g, "-")
}
