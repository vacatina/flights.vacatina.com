import { Plane } from "lucide-react"
import { ListingCountryLabel } from "../country-label"

export function VisaRouteTicket({
  nationality,
  destination,
}: {
  nationality: string
  destination: string
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-[24px] border border-primary/10 bg-card p-5 text-card-foreground shadow-[0_14px_36px_-22px_rgba(10,19,69,0.35)] sm:gap-6 sm:p-6">
      <RouteCountry label="Passport country" code={nationality} />
      <span className="flex size-11 items-center justify-center rounded-full border border-primary/15 bg-primary/5 text-primary">
        <Plane className="size-5" aria-hidden="true" />
      </span>
      <RouteCountry label="Destination" code={destination} />
    </div>
  )
}

function RouteCountry({ label, code }: { label: string; code: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-heading text-3xl tracking-tight sm:text-4xl">
        {code}
      </span>
      <span className="text-xs sm:text-sm">
        <ListingCountryLabel code={code} />
      </span>
    </div>
  )
}
