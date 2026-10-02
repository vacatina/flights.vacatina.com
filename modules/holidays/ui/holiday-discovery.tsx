import Image from "next/image"
import { ArrowUpRight } from "lucide-react"
import { holidayCategories } from "../data/categories"
import { holidayImage } from "../domain/catalog"
import { cn } from "@/lib/utils"

export function HolidayDiscovery({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (category: string) => void
}) {
  return (
    <section aria-label="Browse by experience" className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-heading text-2xl tracking-tight sm:text-3xl">
          Your kind of escape
        </h2>
        <button
          type="button"
          onClick={() => onSelect("all")}
          aria-pressed={selected === "all"}
          className="rounded-full px-4 py-2 text-sm text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring"
        >
          All experiences
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 md:grid md:grid-cols-4 xl:grid-cols-8">
        {holidayCategories.map((category) => (
          <button
            type="button"
            key={category.slug}
            aria-pressed={selected === category.slug}
            onClick={() =>
              onSelect(selected === category.slug ? "all" : category.slug)
            }
            className={cn(
              "group relative h-40 w-40 shrink-0 overflow-hidden rounded-2xl border-4 border-white text-left text-white shadow-[0_6px_18px_-10px_rgba(10,19,69,0.3)] transition-transform duration-300 outline-none focus-visible:ring-3 focus-visible:ring-ring motion-safe:hover:-translate-y-1 md:w-auto",
              selected === category.slug && "ring-3 ring-primary ring-offset-3"
            )}
          >
            <Image
              src={holidayImage(category.media?.thumbnailImage)!}
              alt={category.media?.alt ?? category.name}
              fill
              sizes="180px"
              className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />
            <ArrowUpRight
              className="absolute top-3 right-3 size-4"
              aria-hidden="true"
            />
            <span className="absolute inset-x-3 bottom-3 text-base leading-tight font-medium">
              {category.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
