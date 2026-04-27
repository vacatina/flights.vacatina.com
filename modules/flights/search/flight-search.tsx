import { FlightSearchForm } from "@/modules/flights/search/ui"

export function FlightSearch() {
  return (
    <main className="bg-muted">
      <section className="relative isolate overflow-hidden pb-18">
        <div className="absolute inset-0 bg-[url('/img/hero.jpg')] bg-cover bg-center bg-no-repeat" />
        <div className="absolute inset-0 bg-[#05103680]" />

        <div className="relative mx-auto w-full max-w-[1900px] px-4 pt-20 md:px-8 lg:px-12 lg:pt-24">
          <div className="mx-auto max-w-4xl text-center text-white">
            <h1 className="text-[54px] font-semibold tracking-[-0.02em] text-balance md:text-[56px]">
              Book Everything in One Place
            </h1>
            <p className="mt-4 text-[18px] text-balance text-white/85 md:text-[19px]">
              Book flights, hotels, cruises, cars, and experiences-all from one
              place.
            </p>
          </div>

          <div className="mx-auto mt-8 w-full max-w-[1720px] md:mt-10">
            <FlightSearchForm />
          </div>
        </div>
      </section>
    </main>
  )
}
