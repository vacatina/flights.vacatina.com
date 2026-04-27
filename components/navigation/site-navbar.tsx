"use client"

import { Show, UserButton } from "@clerk/nextjs"
import { ChevronDownIcon, MenuIcon, XIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

export function SiteNavbar({ clerkEnabled }: SiteNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileOpenSection, setMobileOpenSection] = useState<
    "addons" | "resources" | null
  >(null)

  return (
    <header className="sticky top-0 z-40 border-b border-primary/80 bg-[#13357b] text-primary-foreground">
      <div className="mx-auto flex h-[76px] w-full items-center px-4 lg:h-[112px] lg:px-8">
        <Link href="/" className="shrink-0" aria-label="Vacatina home">
          <Image
            src="/img/logo-light.svg"
            alt="Vacatina"
            width={230}
            height={50}
            priority
            className="h-[30px] w-auto lg:h-[50px]"
          />
        </Link>

        <nav className="ml-12 hidden items-center gap-11 text-[17px] font-medium xl:flex">
          {primaryNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="transition-opacity hover:opacity-80"
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

        <div className="ml-auto hidden items-center gap-7 xl:flex">
          <button
            type="button"
            className="flex items-center gap-2 text-[17px] leading-none font-medium tracking-[0.01em]"
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
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 transition-opacity outline-none hover:opacity-80 data-[popup-open]:opacity-100">
        {label}
        <ChevronDownIcon className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="center"
        sideOffset={22}
        className="relative w-[312px] rounded-[4px] border border-border bg-popover p-7 text-[20px] text-popover-foreground shadow-[0_12px_30px_rgba(8,20,56,0.08)] before:absolute before:-top-[6px] before:left-1/2 before:size-3 before:-translate-x-1/2 before:rotate-45 before:border-t before:border-l before:border-border before:bg-popover before:content-['']"
      >
        <DropdownMenuGroup className="flex flex-col gap-1">
          {items.map((item, index) => (
            <DropdownMenuItem
              key={item.label}
              className={cn(
                "rounded-[4px] px-5 py-4 text-[20px] font-medium text-popover-foreground transition-colors focus:bg-accent focus:text-accent-foreground",
                highlightFirst && index === 0
                  ? "bg-accent text-accent-foreground"
                  : ""
              )}
              render={<Link href={item.href} />}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
    "border-border bg-secondary text-secondary-foreground hover:bg-secondary/90"
  )
  const signUpClassName = cn(
    "border-primary-foreground/45 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
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
        <div className="rounded-md border border-border bg-secondary px-3 py-2 text-secondary-foreground">
          <UserButton />
        </div>
      </Show>
    </>
  )
}
