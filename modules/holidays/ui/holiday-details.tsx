import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { HolidayActionLink } from "./holiday-action-link"
import { getHolidayContent } from "../domain/content"
import { holidayExcerpt, holidayImage, holidayLabel } from "../domain/catalog"
import type { HolidayPackage } from "../domain/types"
import { holidayPackages, holidayCategories } from "../data"
import { HolidayHero } from "./holiday-hero"
import { HolidayRoute } from "./holiday-route"
import { HolidayFacts } from "./holiday-facts"
import { HolidaySection, HolidayBulletList } from "./holiday-section"
import { HolidayRichText } from "./holiday-rich-text"
import { HolidayItinerary } from "./holiday-itinerary"
import { HolidayGallery } from "./holiday-gallery"
import { HolidayEnquiry } from "./holiday-enquiry"
import { HolidayPlanning } from "./holiday-planning"
import { HolidayCard } from "./holiday-card"

export function HolidayDetails({ holiday }: { holiday: HolidayPackage }) {
  const sections = getHolidayContent(holiday.slug)
  const category = holidayCategories.find(
    (item) => item.slug === holiday.category
  )
  const itinerary = sections.find((section) =>
    section.title.startsWith("Day-by-day")
  )
  const faq = sections.find(
    (section) => section.title === "Frequently asked questions"
  )
  const overview = sections.find(
    (section) => section.title === "Why choose this itinerary?"
  )
  const planning = sections.filter(
    (section) =>
      ![
        "Why choose this itinerary?",
        "What is normally included",
        "What is normally not included",
        "Frequently asked questions",
      ].includes(section.title) && !section.title.startsWith("Day-by-day")
  )
  const gallery = holiday.media.images.filter((item) => item.role === "gallery")
  const map = holiday.media.images.find((item) => item.role === "map")
  const featurePhoto =
    gallery[0] ?? holiday.media.images.find((item) => item.role === "hero")
  const related = holidayPackages
    .filter(
      (item) => item.category === holiday.category && item.slug !== holiday.slug
    )
    .slice(0, 3)
  const highlights = [
    ...new Set([...holiday.attractions, ...holiday.activities]),
  ]
  return (
    <main className="bg-background">
      <HolidayHero
        title={holiday.title}
        category={category?.name}
        description={holidayExcerpt(holiday.summary)}
        image={holidayImage(holiday.media.heroImage)!}
        alt={holiday.media.alt}
      />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-wrap items-center justify-between gap-4 px-5 pt-8 sm:px-8">
        <Link
          href="/holiday-packages"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          All holiday packages
        </Link>
        <Link
          href="#holiday-enquiry"
          className="inline-flex items-center gap-2 text-sm text-primary lg:hidden"
        >
          Enquire about this trip
          <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="mx-auto grid w-full max-w-screen-2xl gap-10 px-5 pt-10 pb-16 sm:px-8 lg:grid-cols-[1.27fr_1fr] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-10">
          <HolidayFacts holiday={holiday} />
          <HolidaySection title="Trip overview">
            <HolidayRichText body={holiday.summary} />
            {overview && <HolidayRichText body={overview.body} />}
          </HolidaySection>
          <HolidaySection title="Trip highlights">
            <HolidayBulletList
              items={
                highlights.length ? highlights.map(holidayLabel) : holiday.route
              }
            />
          </HolidaySection>
          {featurePhoto && (
            <HolidayGallery title={holiday.title} images={[featurePhoto]} />
          )}
          <HolidaySection title="Your route">
            <HolidayRoute stops={holiday.route} />
            {map && (
              <div className="relative aspect-[1.3] overflow-hidden rounded-2xl bg-card">
                <Image
                  src={holidayImage(map.file)!}
                  alt={map.alt}
                  fill
                  sizes="(min-width: 1536px) 790px, (min-width: 1024px) 52vw, 90vw"
                  className="object-contain"
                />
              </div>
            )}
          </HolidaySection>
          <HolidayItinerary holiday={holiday} longForm={itinerary?.body} />
          <HolidaySection title="What's included">
            <HolidayBulletList items={holiday.inclusions} />
          </HolidaySection>
          <HolidaySection title="What's excluded">
            <HolidayBulletList items={holiday.exclusions} />
          </HolidaySection>
          <HolidayGallery title={holiday.title} images={gallery.slice(1)} />
          {holiday.seasonNote && (
            <HolidaySection title="When to travel">
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                {holiday.seasonNote}
              </p>
            </HolidaySection>
          )}
          <HolidayPlanning sections={planning} faq={faq?.body} />
          <HolidayActionLink href="#holiday-enquiry">
            Plan this holiday
            <ArrowRight data-icon="inline-end" />
          </HolidayActionLink>
        </div>
        <HolidayEnquiry holiday={holiday} />
      </div>
      {!!related.length && (
        <section
          aria-labelledby="related-holidays"
          className="mx-auto flex w-full max-w-screen-2xl flex-col gap-7 px-5 pt-8 pb-20 sm:px-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2
              id="related-holidays"
              className="font-heading text-3xl font-normal tracking-tight"
            >
              More journeys to inspire you
            </h2>
            <Link
              href="/holiday-packages"
              className="inline-flex items-center gap-2 text-sm text-primary"
            >
              Explore all holidays
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <HolidayCard key={item.id} holiday={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
