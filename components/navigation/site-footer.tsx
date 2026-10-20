import Link from "next/link"
import Image from "next/image"

import { contactData } from "@/lib/shared/contact-data"

const serviceLinks = [
  ["Flights", "/#search-command-center"],
  ["Hotels", "/hotels"],
  ["Cars & Transfers", "/#search-command-center"],
  ["Rails", "/#search-command-center"],
  ["Cruises", "/#search-command-center"],
  ["Holiday Packages", "/holiday-packages"],
  ["Visa Assistance", "/visa-assistance"],
  ["Activities", "/#search-command-center"],
  ["Sightseeing Tours", "/#travel-inspiration"],
  ["Travel Insurance", "/#travel-confidence"],
] as const

const inspirationLinks = [
  ["Maldives", "/#travel-inspiration"],
  ["Dubai", "/#travel-inspiration"],
  ["Sri Lanka", "/holiday-packages"],
  ["Bali", "/#travel-inspiration"],
  ["Thailand", "/#travel-inspiration"],
  ["Europe", "/#travel-inspiration"],
] as const

const companyLinks = [
  ["About Vacatina", "/about-us"],
  ["Careers", "/contact-us"],
  ["Corporate Travel", "/contact-us"],
  ["Travel Agency Partners", "/contact-us"],
  ["Sustainability", "/about-us"],
  ["Press & Media", "/contact-us"],
] as const

const accountLinks = [
  ["My Trips", "/bookings"],
  ["Saved / Favorites", "/bookings"],
  ["Trip Bucket", "/bookings"],
  ["Visa Applications", "/visa-requests"],
  ["Help Center & FAQ", "/faq"],
  ["Contact Support", "/contact-us"],
] as const

export function SiteFooter() {
  return (
    <footer className="bg-[#1B1464] text-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <Link href="/" aria-label="Vacatina home" className="inline-flex">
              <Image
                src="/img/logo-light.svg"
                alt="Vacatina"
                width={230}
                height={50}
                className="h-9 w-auto"
              />
            </Link>
            <p className="mt-4 text-sm text-white/75">We treasure your holidays.</p>

            <div className="mt-8 space-y-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-white/55 uppercase">
                  Customer Care
                </p>
                <a
                  href={`tel:${contactData.phone.value}`}
                  className="mt-2 inline-block text-base font-semibold hover:underline"
                >
                  +94 11 360 6200
                </a>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-white/55 uppercase">
                  Need live support?
                </p>
                <a
                  href={`mailto:${contactData.email}`}
                  className="mt-2 inline-block text-base font-semibold hover:underline"
                >
                  {contactData.email}
                </a>
              </div>
            </div>
          </div>

          <FooterColumn title="Services" links={serviceLinks} />
          <FooterColumn title="Travel Inspiration" links={inspirationLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn title="Account & Help" links={accountLinks} />
        </div>

        <div className="mt-12 border-t border-white/15 pt-6">
          <div className="flex flex-col gap-4 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
            <p>All rights by Vacatina.</p>
            <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-3">
              <Link href="/privacy" className="hover:text-white hover:underline">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white hover:underline">
                Terms & Conditions
              </Link>
              <Link href="/accessibility" className="hover:text-white hover:underline">
                Accessibility
              </Link>
              <Link href="/site-map" className="hover:text-white hover:underline">
                Site Map
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: readonly (readonly [string, string])[]
}) {
  return (
    <div>
      <h2 className="text-sm font-bold tracking-[0.1em] text-white uppercase">
        {title}
      </h2>
      <ul className="mt-5 space-y-3">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="inline-flex min-h-8 items-center text-sm text-white/72 transition-colors hover:text-white hover:underline"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
