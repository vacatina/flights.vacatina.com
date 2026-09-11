import { AlertCircleIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  getVisaCountry,
  type VisaAssistanceResult,
} from "@/modules/visa-assistance/domain"
import { VisaApplicationChecklist } from "@/modules/visa-assistance/ui/visa-application-checklist"
import { VisaApplicationSteps } from "@/modules/visa-assistance/ui/visa-application-steps"
import { VisaDetailsHero } from "@/modules/visa-assistance/ui/visa-details-hero"
import { VisaOptionsSection } from "@/modules/visa-assistance/ui/visa-options-section"
import { VisaProductFaq } from "@/modules/visa-assistance/ui/visa-product-faq"
import { VisaRecheckSection } from "@/modules/visa-assistance/ui/visa-recheck-section"

interface VisaDetailsProps {
  result: VisaAssistanceResult
}

export function VisaDetails({ result }: VisaDetailsProps) {
  const destination = getVisaCountry(result.destination)
  const primaryDocument = result.eligibleDocuments[0]
  const primaryValidity =
    primaryDocument?.product?.validity ?? primaryDocument?.document.validity
  const hasVisaOption = result.eligibleDocuments.length > 0

  return (
    <main className="bg-background">
      <VisaDetailsHero result={result} />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-12 md:gap-20 md:px-8 md:py-16 lg:px-12 lg:py-20">
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
          nationalityCode={result.nationality}
          destinationCode={result.destination}
        />

        {hasVisaOption ? (
          <>
            <VisaApplicationChecklist />
            <VisaApplicationSteps />
            <VisaProductFaq
              destination={destination?.name ?? result.destination}
              maximumStay={asOptionalString(primaryValidity?.max_stay)}
              entries={asOptionalString(primaryValidity?.num_entries)}
            />
          </>
        ) : null}

        <Alert className="rounded-2xl border-[#13357b]/15 bg-[#eef3f8] text-foreground dark:border-border dark:bg-card">
          <AlertCircleIcon className="text-[#13357b] dark:text-blue-300" />
          <AlertTitle>Requirements can change</AlertTitle>
          <AlertDescription className="leading-relaxed">
            Confirm the latest rules with the destination’s embassy or
            immigration authority before booking or departure. Border officials
            make the final decision on entry.
          </AlertDescription>
        </Alert>

        <VisaRecheckSection result={result} />
      </div>
    </main>
  )
}

function cleanVisibleText(value: string) {
  return value.replace(/[\u2013\u2014]/g, "-")
}

function asOptionalString(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  return String(value)
}
