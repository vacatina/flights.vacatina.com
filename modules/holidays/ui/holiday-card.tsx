import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Clock3, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { HolidayPackage } from "../domain/types"
import { holidayImage, holidayPrice } from "../domain/catalog"
import { holidayCategories } from "../data/categories"

export function HolidayCard({ holiday }: { holiday: HolidayPackage }) {
  const category = holidayCategories.find(
    (item) => item.slug === holiday.category
  )
  return (
    <article className="group h-full min-w-0 rounded-[26px] border border-primary/10 bg-card p-2.5 text-card-foreground shadow-[0_8px_30px_-18px_rgba(10,19,69,0.24)] transition-[transform,box-shadow,border-color] duration-300 hover:border-primary/25 hover:shadow-[0_20px_45px_-22px_rgba(10,19,69,0.35)]">
      <Link
        href={`/holiday-packages/${holiday.slug}`}
        className="block rounded-[20px] outline-none focus-visible:ring-3 focus-visible:ring-ring"
        aria-label={`Explore ${holiday.title}`}
      >
        <div className="relative aspect-[1.12] overflow-hidden rounded-[18px]">
          <Image
            src={holidayImage(holiday.media.thumbnailImage)!}
            alt={holiday.media.alt}
            fill
            sizes="(min-width: 1536px) 485px, (min-width: 1024px) 32vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-brand-navy/45 via-transparent to-transparent" />
          <div className="absolute top-3 left-3">
            <Badge
              variant="secondary"
              className="rounded-full border border-white/50 bg-white/90 px-3 py-1 text-brand-navy shadow-sm backdrop-blur-md"
            >
              {category?.name}
            </Badge>
          </div>
          <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-2 text-xs font-medium text-white shadow-sm backdrop-blur-md">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {holiday.duration.days} days / {holiday.duration.nights} nights
          </span>
          <span
            className="absolute right-4 bottom-4 flex size-12 items-center justify-center rounded-full bg-white text-brand-navy transition-all duration-300 motion-safe:group-hover:-rotate-45"
            aria-hidden="true"
          >
            <ArrowUpRight className="size-6" />
          </span>
        </div>
        <div className="flex flex-col gap-3 px-2 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-heading text-xl leading-snug font-medium">
              {holiday.title}
            </h2>
            <span className="shrink-0 pt-0.5 text-sm font-medium text-primary">
              {holidayPrice(holiday.price)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-primary/10 pt-3 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {holiday.route.slice(0, 2).join(" & ")}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 font-medium text-primary">
              Explore journey
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
