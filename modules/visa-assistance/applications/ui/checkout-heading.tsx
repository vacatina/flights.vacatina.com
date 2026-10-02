import { ArrowRight, Plane, ShieldCheck } from "lucide-react"
import type { VisaApplicationDetail } from "../domain"
import { getVisaCountry } from "@/modules/visa-assistance/domain"
import { CountryFlag } from "@/modules/visa-assistance/ui/country-flag"

export function VisaCheckoutHeading({
  detail,
}: {
  detail: VisaApplicationDetail
}) {
  const { application } = detail
  const passport = getVisaCountry(application.nationalityCode)
  const destination = getVisaCountry(application.destinationCode)
  return (
    <header className="relative isolate overflow-hidden bg-brand-navy pt-8 pb-14 text-white md:pt-10">
      <Plane
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 right-[12%] -z-10 size-72 -rotate-12 text-white/[0.04]"
        strokeWidth={0.75}
      />
      <div className="mx-auto grid w-full max-w-screen-2xl gap-6 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
        <div>
          <p className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium tracking-[0.12em] text-white/75 uppercase">
            <ShieldCheck className="size-4" aria-hidden="true" /> Vacatina visa
            request{" "}
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 tracking-normal">
              {application.reference}
            </span>
          </p>
          <h1 className="font-heading text-3xl font-normal tracking-tight text-balance md:text-4xl">
            {application.visaName}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
            Complete each step at your own pace. Your progress is saved as you
            continue.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/20 bg-white/10 p-5">
          {[passport, destination].map((country, index) => (
            <div key={index} className="contents">
              {index === 1 ? (
                <ArrowRight
                  className="size-4 shrink-0 text-white/60"
                  aria-hidden="true"
                />
              ) : null}
              <div className="flex min-w-0 flex-col gap-2">
                <span className="text-[10px] tracking-wider text-white/65 uppercase">
                  {index === 0 ? "Passport" : "Destination"}
                </span>
                <span className="flex items-center gap-2 text-sm font-medium">
                  {country ? <CountryFlag src={country.flagSrc} /> : null}
                  <span>
                    {country?.name ??
                      (index === 0
                        ? application.nationalityCode
                        : application.destinationCode)}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  )
}
