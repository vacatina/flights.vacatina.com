import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getHolidayBySlug, holidayPackages } from "@/modules/holidays/data"
import { holidayExcerpt } from "@/modules/holidays/domain/catalog"
import { HolidayDetails } from "@/modules/holidays/ui/holiday-details"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return holidayPackages.map((holiday) => ({ slug: holiday.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const holiday = getHolidayBySlug(slug)
  if (!holiday) return { title: "Holiday not found | Vacatina" }
  return {
    title: `${holiday.title} | Vacatina`,
    description: holidayExcerpt(holiday.summary),
  }
}

export default async function HolidayPackagePage({ params }: Props) {
  const { slug } = await params
  const holiday = getHolidayBySlug(slug)
  if (!holiday) notFound()
  return <HolidayDetails holiday={holiday} />
}
