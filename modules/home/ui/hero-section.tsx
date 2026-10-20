import Link from "next/link"
import {
  ArrowRightIcon,
  Layers3Icon,
  ScanSearchIcon,
  ShieldCheckIcon,
} from "lucide-react"

const valuePoints = [
  { icon: ScanSearchIcon, label: "Compare live options" },
  { icon: ShieldCheckIcon, label: "Transparent trip planning" },
  { icon: Layers3Icon, label: "One place for your journey" },
]

export function HeroSection() {
  return (
    <section
      aria-labelledby="home-title"
      className="relative isolate -mt-[76px] overflow-hidden bg-[#1B1464] pt-[76px] text-white"
    >
      <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_34%),radial-gradient(circle_at_85%_10%,white_0,transparent_30%)]" />

      <div className="relative mx-auto flex min-h-[560px] w-full max-w-[1320px] flex-col justify-center px-4 py-20 sm:px-6 md:py-24 lg:px-8">
        <div className="max-w-4xl">
          <p className="mb-5 text-sm font-semibold tracking-[0.14em] text-white/70 uppercase">
            Vacatina Travel
          </p>
          <h1
            id="home-title"
            className="font-heading text-4xl leading-[1.06] font-bold tracking-[-0.04em] text-balance sm:text-5xl lg:text-[64px]"
          >
            Book Everything in One Place
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/82 sm:text-lg">
            Flights, stays, visa assistance and unforgettable experiences,
            brought together around one journey.
          </p>

          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
            {valuePoints.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 text-sm font-medium text-white/90"
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>

          <div className="mt-10 max-w-3xl rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 px-2">
                <p className="text-xs font-semibold tracking-[0.12em] text-white/60 uppercase">
                  Ask Vacatina
                </p>
                <p className="mt-1 text-sm text-white/90">
                  Plan 5 days in Dubai with flights, hotel and visa assistance.
                </p>
              </div>
              <Link
                href="mailto:info@vacatina.com?subject=Plan%20my%20trip"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-white px-5 text-sm font-semibold text-[#1B1464] hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Plan My Trip
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
