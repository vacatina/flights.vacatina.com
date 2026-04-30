"use client"

import { Show, UserButton } from "@clerk/nextjs"
import { ChevronDownIcon, MenuIcon, XIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SiteNavbarProps = {
  clerkEnabled: boolean
}

type NavLinkItem = {
  href: string
  label: string
}

const primaryNavItems: NavLinkItem[] = [
  { href: "/", label: "Home" },
  { href: "#", label: "Flights" },
  { href: "#", label: "Hotels" },
  { href: "#", label: "Cars" },
  { href: "#", label: "Rails" },
  { href: "#", label: "Cruises" },
]

const addOnItems: NavLinkItem[] = [
  { href: "#", label: "Activities" },
  { href: "#", label: "Visa Assistance" },
  { href: "#", label: "Sightseeing Tours" },
  { href: "#", label: "Holiday Packages" },
  { href: "#", label: "Travel Insurance" },
]

const resourceItems: NavLinkItem[] = [
  { href: "#", label: "Blog" },
  { href: "#", label: "About Us" },
  { href: "#", label: "FAQ" },
  { href: "#", label: "Contact Us" },
]

const transparentNavbarRoutes = ["/"]
const scrollThresholdPx = 12

export function SiteNavbar({ clerkEnabled }: SiteNavbarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileOpenSection, setMobileOpenSection] = useState<
    "addons" | "resources" | null
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
        "sticky top-0 z-40 text-primary-foreground transition-colors duration-200",
        shouldShowTransparentNavbar ? "bg-transparent" : "bg-[#13357b]"
      )}
    >
      <div className="mx-auto flex h-[90px] w-full items-center px-4 lg:px-8">
        <Link href="/" className="shrink-0" aria-label="Vacatina home">
          <Image
            src="/img/logo-light.svg"
            alt="Vacatina"
            width={230}
            height={50}
            priority
            className="h-[26px] w-auto lg:h-[40px]"
          />
        </Link>

        <nav className="ml-10 hidden items-center gap-8 text-[15px] font-medium xl:flex">
          {primaryNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="whitespace-nowrap transition-opacity hover:opacity-80"
            >
              {item.label}
            </Link>
          ))}

          <DesktopDropdown label="Add-Ons" items={addOnItems} />
          <DesktopDropdown
            label="Resources"
            items={resourceItems}
            highlightFirst
          />
        </nav>

        <div className="ml-auto hidden items-center gap-4 xl:flex">
          <button
            type="button"
            className="flex items-center gap-1.5 text-[14px] leading-none font-medium tracking-[0.01em]"
          >
            INR
            <ChevronDownIcon className="size-4" aria-hidden="true" />
          </button>

          <div
            className="h-8 w-px bg-primary-foreground/20"
            aria-hidden="true"
          />

          <AuthButtons clerkEnabled={clerkEnabled} />
        </div>

        <button
          type="button"
          className="ml-auto inline-flex size-11 items-center justify-center rounded-lg border border-primary-foreground/20 text-primary-foreground transition-colors hover:bg-primary-foreground/10 xl:hidden"
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navbar-menu"
          aria-label={
            mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
        >
          {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div
          id="mobile-navbar-menu"
          className="border-t border-primary-foreground/15 bg-[#13357b] px-4 pt-4 pb-6 xl:hidden"
        >
          <div className="flex flex-col gap-3 text-[16px] font-medium">
            {primaryNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-md px-3 py-2 transition-colors hover:bg-primary-foreground/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <MobileSection
              label="Add-Ons"
              isOpen={mobileOpenSection === "addons"}
              onToggle={() =>
                setMobileOpenSection((current) =>
                  current === "addons" ? null : "addons"
                )
              }
              items={addOnItems}
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

          <div
            className="my-4 h-px bg-primary-foreground/15"
            aria-hidden="true"
          />

          <button
            type="button"
            className="mb-4 flex items-center gap-2 px-3 text-[16px] font-medium"
          >
            INR
            <ChevronDownIcon className="size-4" aria-hidden="true" />
          </button>

          <div className="flex flex-col gap-3">
            <AuthButtons clerkEnabled={clerkEnabled} mobile />
          </div>
        </div>
      ) : null}
    </header>
  )
}

function matchesTransparentNavbarRoute(pathname: string | null) {
  if (!pathname) {
    return false
  }

  return transparentNavbarRoutes.some((route) => {
    if (route === "/") {
      return pathname === "/"
    }

    return pathname === route || pathname.startsWith(`${route}/`)
  })
}

function subscribeToScrollPosition(onStoreChange: () => void) {
  window.addEventListener("scroll", onStoreChange, { passive: true })
  return () => {
    window.removeEventListener("scroll", onStoreChange)
  }
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
  highlightFirst = false,
}: {
  label: string
  items: NavLinkItem[]
  highlightFirst?: boolean
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 whitespace-nowrap transition-opacity outline-none hover:opacity-80"
      >
        {label}
        <ChevronDownIcon className="size-4" aria-hidden="true" />
      </button>

      <div
        className="invisible absolute top-full left-1/2 z-50 mt-3 w-[250px] -translate-x-1/2 rounded-[4px] border border-border bg-popover p-3 text-[16px] text-popover-foreground opacity-0 shadow-md group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
        role="menu"
      >
        <div className="flex flex-col gap-1">
          {items.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "rounded-[4px] px-3 py-2.5 text-[16px] font-medium text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                highlightFirst && index === 0
                  ? "bg-accent text-accent-foreground"
                  : ""
              )}
              role="menuitem"
            >
              {item.label}
            </Link>
          ))}
        </div>
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
    <div className="rounded-md bg-primary-foreground/5">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        onClick={onToggle}
      >
        <span>{label}</span>
        <ChevronDownIcon
          className={cn(
            "size-4 transition-transform",
            isOpen ? "rotate-180" : ""
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div className="flex flex-col gap-1 px-2 pb-2">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-md px-3 py-2 text-primary-foreground/90 hover:bg-primary-foreground/10"
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
  const size: "sm" | "default" = mobile ? "sm" : "default"
  const signInClassName = cn(
    "border-border bg-secondary text-secondary-foreground hover:bg-secondary/90",
    mobile ? "h-10 px-5 text-[15px]" : "h-12 px-7 text-[16px]"
  )
  const signUpClassName = cn(
    "border-primary-foreground/45 bg-transparent text-primary-foreground hover:bg-primary-foreground/10",
    mobile ? "h-10 px-5 text-[15px]" : "h-12 px-7 text-[16px]"
  )
  const dashboardClassName = cn(
    "border-border bg-secondary text-secondary-foreground hover:bg-secondary/90",
    mobile ? "h-10 px-5 text-[15px]" : "h-12 px-7 text-[16px]"
  )

  if (!clerkEnabled) {
    return (
      <>
        <Button
          variant="secondary"
          size={size}
          className={signInClassName}
          render={<Link href="/sign-in" />}
        >
          Sign In
        </Button>
        <Button
          variant="outline"
          size={size}
          className={signUpClassName}
          render={<Link href="/sign-up" />}
        >
          Sign Up for Free
        </Button>
      </>
    )
  }

  return (
    <>
      <Show when="signed-out">
        <Button
          variant="secondary"
          size={size}
          className={signInClassName}
          render={<Link href="/sign-in" />}
        >
          Sign In
        </Button>
        <Button
          variant="outline"
          size={size}
          className={signUpClassName}
          render={<Link href="/sign-up" />}
        >
          Sign Up for Free
        </Button>
      </Show>

      <Show when="signed-in">
        <Button
          variant="secondary"
          size={size}
          className={dashboardClassName}
          render={<Link href="/bookings" />}
        >
          Dashboard
        </Button>
        <UserButton />
      </Show>
    </>
  )
}
