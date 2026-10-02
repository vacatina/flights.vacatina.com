import { ArrowRightIcon } from "lucide-react"
import { ListingCountryLabel } from "../country-label"

export function VisaRouteHeading({
  nationality,
  destination,
  title,
  description,
}: {
  nationality: string
  destination: string
  title: string
  description: string
}) {
  return (
    <header className="border-b bg-muted/30">
      <div className="w-full mx-auto flex max-w-screen-2xl flex-col gap-5 px-4 py-10 md:px-8 md:py-14">
        <p className="text-sm font-medium text-primary">
          Vacatina visa assistance
        </p>
        <h1 className="max-w-4xl font-heading text-3xl font-semibold tracking-tight text-balance [overflow-wrap:anywhere] md:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl [overflow-wrap:anywhere] whitespace-pre-line text-muted-foreground">
          {description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              Passport country
            </span>
            <ListingCountryLabel code={nationality} />
          </div>
          <ArrowRightIcon
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Destination</span>
            <ListingCountryLabel code={destination} />
          </div>
        </div>
      </div>
    </header>
  )
}
