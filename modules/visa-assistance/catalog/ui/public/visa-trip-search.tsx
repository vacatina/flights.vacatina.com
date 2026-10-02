import { Compass } from "lucide-react"
import { VisaSearchForm } from "@/modules/visa-assistance/ui/visa-search-form"

export function VisaTripSearch({
  nationality,
  destination,
}: {
  nationality: string
  destination: string
}) {
  return (
    <section
      className="relative isolate grid gap-8 overflow-hidden rounded-[32px] bg-brand-navy p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:p-10"
      aria-labelledby="change-trip-heading"
    >
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -left-20 -z-10 size-96 rounded-full bg-primary/30 blur-3xl"
      />
      <div className="flex flex-col gap-4 text-white">
        <Compass className="size-10 text-white/60" aria-hidden="true" />
        <h2
          id="change-trip-heading"
          className="font-heading text-3xl font-normal tracking-tight sm:text-4xl"
        >
          Planning another trip?
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-white/70">
          Choose a passport country and destination to explore our services.
        </p>
      </div>
      <div className="rounded-[24px] bg-card p-5 text-card-foreground shadow-xl sm:p-7">
        <VisaSearchForm
          key={`${nationality}-${destination}`}
          compact
          initialValues={{ nationality, destination }}
        />
      </div>
    </section>
  )
}
