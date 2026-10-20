import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon, BedDoubleIcon } from "lucide-react"

const stayIdeas = [
  {
    destination: "Dubai",
    image: "/img/destinations/dubai.webp",
    copy: "City stays close to shopping, business districts and attractions.",
  },
  {
    destination: "London",
    image: "/img/destinations/london.webp",
    copy: "Explore stays across central neighbourhoods and major transport links.",
  },
  {
    destination: "Singapore",
    image: "/img/destinations/singapore.webp",
    copy: "Discover city hotels for stopovers, business and longer stays.",
  },
  {
    destination: "Bangkok",
    image: "/img/destinations/bangkok.webp",
    copy: "Find stays around riverside districts, markets and city landmarks.",
  },
] as const

export function HotelDiscoveryHomeSection() {
  return (
    <section
      aria-labelledby="hotel-home-title"
      className="mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-6 md:py-20 lg:px-8"
    >
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[#1B1464] uppercase">
            Stays
          </p>
          <h2
            id="hotel-home-title"
            className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[#111] md:text-[40px]"
          >
            Find the stay that fits your trip
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#525252]">
            Search connected hotel inventory with your real dates, guests and
            room requirements.
          </p>
        </div>
        <Link
          href="/hotels"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#1B1464] underline-offset-4 hover:underline"
        >
          Search hotels
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stayIdeas.map((item) => (
          <Link
            key={item.destination}
            href="/hotels"
            className="group overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white outline-none focus-visible:ring-2 focus-visible:ring-[#1B1464]"
          >
            <div className="relative aspect-[4/3] bg-[#F5F5F5]">
              <Image
                src={item.image}
                alt={item.destination}
                fill
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1B1464]">
                <BedDoubleIcon className="size-4" aria-hidden="true" />
                Destination stay ideas
              </div>
              <h3 className="mt-3 font-heading text-xl font-semibold">
                {item.destination}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#525252]">
                {item.copy}
              </p>
              <span className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#1B1464]">
                Search live hotel options
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
