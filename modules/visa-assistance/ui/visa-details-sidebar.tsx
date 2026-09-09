import { SearchIcon, ShieldCheckIcon } from "lucide-react"

import type { VisaAssistanceResult } from "@/modules/visa-assistance/domain"
import { VisaSearchForm } from "@/modules/visa-assistance/ui/visa-search-form"

export function VisaDetailsSidebar({
  result,
}: {
  result: VisaAssistanceResult
}) {
  return (
    <aside className="lg:sticky lg:top-28">
      <div className="rounded-2xl bg-[#f1f5fa] p-5 md:p-6 dark:bg-card">
        <SearchIcon
          className="size-5 text-[#13357b] dark:text-blue-300"
          aria-hidden="true"
        />
        <h2 className="mt-5 text-xl font-semibold tracking-tight">
          Check another trip
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Change your passport country or destination.
        </p>

        <div className="mt-6">
          <VisaSearchForm
            compact
            initialValues={{
              nationality: result.nationality,
              destination: result.destination,
            }}
          />
        </div>

        <div className="mt-7 flex gap-3 border-t border-[#13357b]/10 pt-6 dark:border-border">
          <ShieldCheckIcon
            className="mt-0.5 size-5 shrink-0 text-[#13357b] dark:text-blue-300"
            aria-hidden="true"
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Stay rules, passport needs, and available fees are kept together in
            one clear summary.
          </p>
        </div>
      </div>
    </aside>
  )
}
