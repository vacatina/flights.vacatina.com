import { FlightSearchForm } from "@/modules/flights/search/ui"
import type { FlightSearchFormValues } from "@/modules/flights/search/domain"

interface FlightSearchProps {
  initialValues?: FlightSearchFormValues
}

export function FlightSearch({ initialValues }: FlightSearchProps) {
  return (
    <main className="bg-muted">
      <section className="relative isolate -mt-[90px] flex h-fit min-h-[100dvh] md:h-[100dvh] md:min-h-[700px] flex-col overflow-hidden pb-10 pt-[90px]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#5f83a8] via-[#e8a878] via-55% to-[#1a2a3d]" />
        <div className="absolute inset-0 bg-[url('/img/hero.jpg')] bg-cover bg-center bg-no-repeat" />
        <div className="absolute inset-0 bg-[#05103680]" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 md:px-8 lg:px-12">
          <div className="mx-auto max-w-4xl shrink-0 text-center text-white">
            <h1 className="text-[54px] font-semibold tracking-[-0.02em] leading-14 text-balance md:text-[56px]">
              Book Everything in One Place
            </h1>
            <p className="mt-4 text-[18px] text-balance text-white/85 md:text-[19px]">
              Book flights, hotels, cruises, cars, and experiences-all from one
              place.
            </p>
          </div>

          <div className="mx-auto mt-8 flex w-full max-w-7xl flex-col md:mt-10">
            <FlightSearchForm initialValues={initialValues} />
          </div>
        </div>
      </section>
    </main>
  )
}
