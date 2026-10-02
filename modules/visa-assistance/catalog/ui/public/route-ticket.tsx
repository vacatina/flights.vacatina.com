import { Plane } from "lucide-react"
import { getVisaCountry } from "@/modules/visa-assistance/domain/countries"
import { CountryFlag } from "@/modules/visa-assistance/ui/country-flag"

export function VisaRouteTicket({
  nationality,
  destination,
}: {
  nationality: string
  destination: string
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-[24px] border border-primary/10 bg-card p-4 text-card-foreground shadow-[0_14px_36px_-22px_rgba(10,19,69,0.35)] sm:gap-6 sm:px-6 sm:py-5">
      <RouteCountry label="Passport country" code={nationality} />
      <div aria-hidden="true" className="flex items-center gap-3">
        <span className="hidden w-12 border-t border-dashed border-primary/25 sm:block lg:w-24" />
        <span className="flex size-10 items-center justify-center rounded-full border border-primary/15 bg-primary/5 text-primary">
          <Plane className="size-4 -rotate-12" />
        </span>
        <span className="hidden w-12 border-t border-dashed border-primary/25 sm:block lg:w-24" />
      </div>
      <RouteCountry label="Destination" code={destination} />
    </div>
  )
}

function RouteCountry({ label, code }: { label: string; code: string }) {
  const country = getVisaCountry(code)
  return (
    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
      {country ? (
        <span className="hidden shrink-0 rounded-2xl bg-primary/5 p-3 ring-1 ring-primary/10 sm:block">
          <CountryFlag src={country.flagSrc} className="h-7 w-10 rounded-md" />
        </span>
      ) : null}
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </span>
        <span className="flex items-center gap-2 font-heading text-base leading-tight tracking-tight sm:text-xl">
          {country ? (
            <CountryFlag src={country.flagSrc} className="sm:hidden" />
          ) : null}
          <span>{country?.name ?? code}</span>
        </span>
      </div>
    </div>
  )
}
