import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react"
import Link from "next/link"

import { SiteNavbar } from "@/components/navigation/site-navbar"
import { isClerkConfigured } from "@/modules/auth/server/config"

export default async function FlightChangeLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ bookingReference: string }>
}>) {
  const [{ bookingReference }, clerkEnabled] = await Promise.all([
    params,
    isClerkConfigured(),
  ])
  const bookingHref = `/booking/${encodeURIComponent(bookingReference)}`
  const changeHref = `${bookingHref}/change`

  return (
    <>
      <SiteNavbar clerkEnabled={clerkEnabled} />
      <div className="border-b border-[#dfe4ec] bg-white">
        <div className="w-full mx-auto flex min-h-14 max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Flight change breadcrumb"
            className="flex min-w-0 items-center gap-2 text-sm"
          >
            <Link
              href={bookingHref}
              className="inline-flex shrink-0 items-center gap-1.5 font-medium text-[#344054] transition-colors hover:text-[#1749d8]"
            >
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back to booking</span>
              <span className="sm:hidden">Booking</span>
            </Link>
            <ChevronRightIcon
              className="size-4 shrink-0 text-[#98a2b3]"
              aria-hidden="true"
            />
            <Link
              href={bookingHref}
              className="truncate font-medium text-[#667085] hover:text-[#1749d8]"
            >
              {bookingReference}
            </Link>
            <ChevronRightIcon
              className="size-4 shrink-0 text-[#98a2b3]"
              aria-hidden="true"
            />
            <Link
              href={changeHref}
              className="truncate font-semibold text-[#1749d8]"
            >
              Change booking
            </Link>
          </nav>

          <Link
            href={bookingHref}
            className="hidden shrink-0 text-sm font-semibold text-[#1749d8] hover:text-[#123fc0] sm:inline"
          >
            View itinerary
          </Link>
        </div>
      </div>
      {children}
    </>
  )
}
