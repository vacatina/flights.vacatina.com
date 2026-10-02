import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Clock3, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { HolidayPackage } from "../domain/types"
import { holidayImage, holidayPrice } from "../domain/catalog"
import { holidayCategories } from "../data/categories"

export function HolidayCard({ holiday }: { holiday: HolidayPackage }) {
  const category = holidayCategories.find(
    (item) => item.slug === holiday.category
  )
  return (
    <article className="group rounded-[26px] bg-card p-2.5 text-card-foreground">
      <Link
        href={`/holiday-packages/${holiday.slug}`}
        className="block rounded-[20px] outline-none focus-visible:ring-3 focus-visible:ring-ring"
        aria-label={`Explore ${holiday.title}`}
      >
        <div className="relative aspect-[1.28] overflow-hidden rounded-[18px]">
          <Image
            src={holidayImage(holiday.media.thumbnailImage)!}
            alt={holiday.media.alt}
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
          />
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="rounded-full">
              {category?.name}
            </Badge>
          </div>
          <span
            className="absolute right-4 bottom-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
            aria-hidden="true"
          >
            <ArrowUpRight className="size-6" />
          </span>
        </div>
        <div className="flex flex-col gap-3 px-1.5 pt-3.5 pb-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-heading text-lg leading-snug font-medium">
              {holiday.title}
            </h2>
            <span className="shrink-0 pt-0.5 text-sm font-medium text-primary">
              {holidayPrice(holiday.price)}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {holiday.route.slice(0, 2).join(" & ")}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {holiday.duration.days} days / {holiday.duration.nights} nights
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
