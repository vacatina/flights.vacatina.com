import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Clock3 } from "lucide-react"
import { getHolidayBySlug } from "../data"
import { holidayImage } from "../domain/catalog"
import { cn } from "@/lib/utils"

const featuredSlugs = [
  "hill-country-retreat",
  "southern-sands-journey",
  "into-sri-lankas-wild",
]

export function HolidayFeatured() {
  return (
    <section
      aria-labelledby="featured-journeys"
      className="flex flex-col gap-5"
    >
      <h2
        id="featured-journeys"
        className="font-heading text-3xl tracking-tight sm:text-4xl"
      >
        A little inspiration
      </h2>
      <div className="grid gap-4 md:h-[560px] md:grid-cols-[1.4fr_1fr] md:grid-rows-2">
        {featuredSlugs.map((slug, index) => {
          const holiday = getHolidayBySlug(slug)!
          return (
            <Link
              key={slug}
              href={`/holiday-packages/${slug}`}
              className={cn(
                "group relative flex min-h-64 items-end overflow-hidden rounded-[24px] p-6 text-white outline-none focus-visible:ring-3 focus-visible:ring-ring sm:p-8",
                index === 0 && "min-h-96 md:row-span-2"
              )}
            >
              <Image
                src={holidayImage(holiday.media.heroImage)!}
                alt={holiday.media.alt}
                fill
                sizes={
                  index === 0
                    ? "(min-width: 1024px) 55vw, 90vw"
                    : "(min-width: 1024px) 40vw, 90vw"
                }
                className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
              <div className="relative flex w-full items-end justify-between gap-5">
                <div className="max-w-md">
                  <span className="mb-3 flex items-center gap-2 text-sm">
                    <Clock3 className="size-4" />
                    {holiday.duration.days} days / {holiday.duration.nights}{" "}
                    nights
                  </span>
                  <h3
                    className={cn(
                      "font-heading text-2xl leading-tight tracking-tight",
                      index === 0 && "sm:text-4xl"
                    )}
                  >
                    {holiday.title}
                  </h3>
                  <p className="mt-3 text-sm text-white/80">
                    {holiday.route.slice(0, 3).join(" · ")}
                  </p>
                </div>
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-brand-navy transition-transform motion-safe:group-hover:-rotate-45">
                  <ArrowUpRight aria-hidden="true" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
