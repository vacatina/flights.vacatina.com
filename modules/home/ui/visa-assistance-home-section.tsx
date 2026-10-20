import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react"

const visaDestinations = [
  {
    destination: "United Arab Emirates",
    image: "/img/destinations/dubai.webp",
    alt: "Dubai skyline",
  },
  {
    destination: "United Kingdom",
    image: "/img/destinations/london.webp",
    alt: "London skyline and Tower Bridge",
  },
  {
    destination: "Thailand",
    image: "/img/destinations/bangkok.webp",
    alt: "Bangkok temple and river",
  },
  {
    destination: "Singapore",
    image: "/img/destinations/singapore.webp",
    alt: "Singapore skyline",
  },
] as const

export function VisaAssistanceHomeSection() {
  return (
    <section
      aria-labelledby="visa-home-title"
      className="mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-6 md:py-20 lg:px-8"
    >
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[#1B1464] uppercase">
            Visa Assistance
          </p>
          <h2
            id="visa-home-title"
            className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[#111] md:text-[40px]"
          >
            Visa support for your next journey
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#525252]">
            Explore destinations and check the requirements that apply to your
            passport. Final visa decisions are made by the relevant authorities.
          </p>
        </div>
        <Link
          href="/visa-assistance"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#1B1464] underline-offset-4 hover:underline"
        >
          Explore all visa services
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visaDestinations.map((item) => (
          <article
            key={item.destination}
            className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white"
          >
            <div className="relative aspect-[4/3] bg-[#F5F5F5]">
              <Image
                src={item.image}
                alt={item.alt}
                fill
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#15803D]">
                <ShieldCheckIcon className="size-4" aria-hidden="true" />
                Guidance-first service
              </div>
              <h3 className="mt-3 font-heading text-xl font-semibold">
                {item.destination}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#525252]">
                Check available assistance, document guidance and destination-specific
                requirements for your trip.
              </p>
              <Link
                href="/visa-assistance"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[#1B1464] px-4 text-sm font-semibold text-[#1B1464] hover:bg-[#FAFAFA]"
              >
                Check visa options
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-5 text-xs leading-6 text-[#525252]">
        Requirements vary by passport, nationality, residence, travel purpose
        and individual circumstances. Vacatina provides application assistance
        and document guidance.
      </p>
    </section>
  )
}
