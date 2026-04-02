import { FlightSearchForm } from "@/modules/flights/search/ui"

export function FlightSearch() {
  return (
    <main className="min-h-svh bg-muted/40 py-6 md:py-10">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <FlightSearchForm />
      </div>
    </main>
  )
}
