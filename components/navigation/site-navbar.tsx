"use client"

import { Show } from "@clerk/nextjs"
import {
  ChevronDownIcon,
  HeartIcon,
  MenuIcon,
  ShoppingBagIcon,
  XIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useSyncExternalStore } from "react"

import { CustomUserButton } from "@/components/auth/custom-user-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CurrencySelector } from "@/modules/currency/ui"

type SiteNavbarProps = {
  clerkEnabled: boolean
}

type NavLinkItem = {
  href: string
  label: string
}

const primaryNavItems: NavLinkItem[] = [
  { href: "/", label: "Home" },
  { href: "/#search-command-center", label: "Flights" },
  { href: "/hotels", label: "Hotels" },
  { href: "/visa-assistance", label: "Visa Assistance" },
  { href: "/holiday-packages", label: "Holiday Packages" },
  { href: "/#search-command-center", label: "Cars & Transfers" },
]

const moreItems: NavLinkItem[] = [
  { href: "/#search-command-center", label: "Activities" },
  { href: "/#travel-inspiration", label: "Sightseeing Tours" },
  { href: "/#search-command-center", label: "Rails" },
  { href: "/#search-command-center", label: "Cruises" },
  { href: "/#travel-confidence", label: "Travel Insurance" },
]

const resourceItems: NavLinkItem[] = [
  { href: "https://www.vacatina.com/blog", label: "Blog" },
  { href: "https://www.vacatina.com/about-us", label: "About Us" },
  { href: "https://www.vacatina.com/faq", label: "FAQ" },
  { href: "https://www.vacatina.com/contact-us", label: "Contact Us" },
]

const transparentNavbarRoutes = ["/", "/visa-assistance", "/hotels"]
const scrollThresholdPx = 12

export function SiteNavbar({ clerkEnabled }: SiteNavbarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileOpenSection, setMobileOpenSection] = useState<
    "more" | "resources" | null
  >(null)
  const scrollY = useSyncExternalStore(
    subscribeToScrollPosition,
    readScrollPosition,
    readServerScrollPosition
  )
  const isScrolled = scrollY > scrollThresholdPx
  const routeUsesTransparentNavbar = matchesTransparentNavbarRoute(pathname)
  const shouldShowTransparentNavbar =
    routeUsesTransparentNavbar && !isScrolled && !mobileMenuOpen

  return (
    <header
      className={cn(
        "sticky top-0 z-40 text-white transition-colors duration-200",
        shouldShowTransparentNavbar
          ? "bg-transparent"
          : "border-b border-white/10 bg-[#1B1464]"
      )}
    >
      <div className="mx-auto flex h-[76px] w-full max-w-[1440px] items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0" aria-label="Vacatina home">
          <Image
            src="/img/logo-light.svg"
            alt="Vacatina"
            width={230}
            height={50}
            priority
            className="h-[28px] w-auto lg:h-[34px]"
          />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="ml-8 hidden items-center gap-5 text-[14px] font-semibold 2xl:flex"
        >
          {primaryNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="whitespace-nowrap rounded-md px-1 py-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {item.label}
            </Link>
          ))}
          <DesktopDropdown label="More" items={moreItems} />
          <DesktopDropdown label="Resources" items={resourceItems} />
        </nav>

        <div className="ml-auto hidden items-center gap-3 2xl:flex">
          <CurrencySelector className="min-h-11 px-2 text-[14px]" />
          <Link
            href="/bookings"
            aria-label="Saved trips and favorites"
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
          >
            <HeartIcon className="size-4" aria-hidden="true" />
            Favorites
          </Link>
          <Link
            href="/bookings"
            aria-label="Trip Bucket"
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
          >
            <ShoppingBagIcon className="size-4" aria-hidden="true" />
            Trip Bucket
          </Link>
          <AuthButtons clerkEnabled={clerkEnabled} />
        </div>

        <button
          type="button"
          className="ml-auto inline-flex size-11 items-center justify-center rounded-[10px] border border-white/25 text-white transition-colors hover:bg-white/10 2xl:hidden"
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navbar-menu"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div
          id="mobile-navbar-menu"
          className="border-t border-white/15 bg-[#1B1464] px-4 pt-4 pb-6 2xl:hidden"
        >
          <div className="flex flex-col gap-2 text-[15px] font-semibold">
            {primaryNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="min-h-11 rounded-[10px] px-3 py-3 hover:bg-white/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <MobileSection
              label="More"
              isOpen={mobileOpenSection === "more"}
              onToggle={() =>
                setMobileOpenSection((current) => (current === "more" ? null : "more"))
              }
              items={moreItems}
              onNavigate={() => setMobileMenuOpen(false)}
            />
            <MobileSection
              label="Resources"
              isOpen={mobileOpenSection === "resources"}
              onToggle={() =>
                setMobileOpenSection((current) =>
                  current === "resources" ? null : "resources"
                )
              }
              items={resourceItems}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </div>

          <div className="my-4 h-px bg-white/15" aria-hidden="true" />

          <div className="flex flex-col gap-3">
            <CurrencySelector className="min-h-11 px-3 text-[15px]" />
            <Link
              href="/bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center gap-2 rounded-[10px] px-3 py-3 hover:bg-white/10"
            >
              <HeartIcon className="size-4" aria-hidden="true" />
              Favorites
            </Link>
            <Link
              href="/bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center gap-2 rounded-[10px] px-3 py-3 hover:bg-white/10"
            >
              <ShoppingBagIcon className="size-4" aria-hidden="true" />
              Trip Bucket
            </Link>
            <AuthButtons clerkEnabled={clerkEnabled} mobile />
          </div>
        </div>
      ) : null}
    </header>
  )
}

function matchesTransparentNavbarRoute(pathname: string | null) {
  if (!pathname) return false
  return (
    transparentNavbarRoutes.includes(pathname) ||
    pathname === "/holiday-packages" ||
    pathname.startsWith("/holiday-packages/")
  )
}

function subscribeToScrollPosition(onStoreChange: () => void) {
  window.addEventListener("scroll", onStoreChange, { passive: true })
  return () => window.removeEventListener("scroll", onStoreChange)
}

function readScrollPosition() {
  return window.scrollY
}

function readServerScrollPosition() {
  return 0
}

function DesktopDropdown({
  label,
  items,
}: {
  label: string
  items: NavLinkItem[]
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-1 outline-none transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        aria-haspopup="menu"
      >
        {label}
        <ChevronDownIcon className="size-4" aria-hidden="true" />
      </button>

      <div
        className="invisible absolute top-full left-1/2 z-50 mt-2 w-[250px] -translate-x-1/2 rounded-[12px] border border-border bg-white p-2 text-[#111] opacity-0 shadow-xl group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
        role="menu"
      >
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="block min-h-11 rounded-[10px] px-3 py-3 text-sm font-semibold text-[#262626] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-[#1B1464]"
            role="menuitem"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function MobileSection({
  label,
  isOpen,
  onToggle,
  items,
  onNavigate,
}: {
  label: string
  isOpen: boolean
  onToggle: () => void
  items: NavLinkItem[]
  onNavigate: () => void
}) {
  return (
    <div className="rounded-[10px] bg-white/5">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between px-3 py-3 text-left"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>{label}</span>
        <ChevronDownIcon
          className={cn("size-4 transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {isOpen ? (
        <div className="flex flex-col gap-1 px-2 pb-2">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="min-h-11 rounded-[10px] px-3 py-3 text-white/90 hover:bg-white/10"
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function AuthButtons({
  clerkEnabled,
  mobile = false,
}: {
  clerkEnabled: boolean
  mobile?: boolean
}) {
  const signInClassName = cn(
    "border-white/30 bg-white text-[#1B1464] hover:bg-white/90",
    mobile ? "h-11 px-5 text-[15px]" : "h-11 px-5 text-[14px]"
  )
  const signUpClassName = cn(
    "border-white/45 bg-transparent text-white hover:bg-white/10 hover:text-white",
    mobile ? "h-11 px-5 text-[15px]" : "h-11 px-5 text-[14px]"
  )

  if (!clerkEnabled) {
    return (
      <>
        <Button
          variant="secondary"
          className={signInClassName}
          render={<Link href="/sign-in" />}
          nativeButton={false}
        >
          Sign In
        </Button>
        <Button
          variant="outline"
          className={signUpClassName}
          render={<Link href="/sign-up" />}
          nativeButton={false}
        >
          Sign Up
        </Button>
      </>
    )
  }

  return (
    <>
      <Show when="signed-out">
        <Button
          variant="secondary"
          className={signInClassName}
          render={<Link href="/sign-in" />}
          nativeButton={false}
        >
          Sign In
        </Button>
        <Button
          variant="outline"
          className={signUpClassName}
          render={<Link href="/sign-up" />}
          nativeButton={false}
        >
          Sign Up
        </Button>
      </Show>
      <Show when="signed-in">
        <CustomUserButton />
      </Show>
    </>
  )
}
