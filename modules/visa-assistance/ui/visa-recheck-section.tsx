import { SearchIcon } from "lucide-react"

import type { VisaAssistanceResult } from "@/modules/visa-assistance/domain"
import { VisaSearchForm } from "@/modules/visa-assistance/ui/visa-search-form"

export function VisaRecheckSection({
  result,
}: {
  result: VisaAssistanceResult
}) {
  return (
    <section className="grid gap-8 rounded-2xl bg-[#eef3f8] p-6 md:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 lg:p-10 dark:bg-card">
      <div>
        <SearchIcon
          className="size-5 text-[#13357b] dark:text-blue-300"
          aria-hidden="true"
        />
        <h2 className="mt-5 font-heading text-2xl font-semibold tracking-[-0.025em] md:text-3xl">
          Planning another trip?
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
          Change your passport country or destination and check the latest
          available guidance.
        </p>
      </div>

      <VisaSearchForm
        compact
        initialValues={{
          nationality: result.nationality,
          destination: result.destination,
        }}
      />
    </section>
  )
}
