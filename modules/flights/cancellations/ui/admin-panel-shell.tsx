import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { MaterialIcon } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"
import type { AdminCancellationQueueItem } from "@/modules/flights/cancellations/server/service"
import { AdminSidebarProfile } from "@/modules/flights/cancellations/ui/admin-sidebar-profile"

interface AdminPanelShellProps {
  active: "dashboard" | "bookings" | "cancellations" | "settings"
  title: string
  description: string
  adminEmail?: string | null
  queueItems?: AdminCancellationQueueItem[]
  children: React.ReactNode
}

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    value: "dashboard",
    icon: "space_dashboard",
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    value: "bookings",
    icon: "flight_takeoff",
  },
  {
    href: "/admin/cancellations",
    label: "Cancellations",
    value: "cancellations",
    icon: "confirmation_number",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    value: "settings",
    icon: "settings",
  },
] as const

export function AdminPanelShell({
  active,
  title,
  description,
  adminEmail,
  queueItems = [],
  children,
}: AdminPanelShellProps) {
  const openCases = queueItems.filter(
    (item) => !["completed", "rejected"].includes(item.status)
  ).length

  return (
    <div className="min-h-svh bg-[#f5f7fb] text-foreground lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="border-b border-[#dfe4ec] bg-white lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex h-20 items-center border-b border-[#e8ebf0] px-5 lg:h-24 lg:px-6">
          <Link href="/admin" aria-label="Vacatina admin dashboard">
            <Image
              src="/img/logo-dark.svg"
              alt="Vacatina"
              width={230}
              height={50}
              priority
              className="h-9 w-auto"
            />
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 py-3 lg:px-4 lg:py-6">
          <p className="hidden px-3 pb-3 text-[11px] font-semibold tracking-[0.08em] text-[#7b8492] uppercase lg:block">
            Flight operations
          </p>
          <nav
            className="flex gap-2 overflow-x-auto lg:block lg:space-y-1.5"
            aria-label="Admin navigation"
          >
            {navItems.map((item) => {
              const isActive = active === item.value

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-11 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors lg:w-full",
                    isActive
                      ? "bg-[#eef3ff] text-[#1749d8]"
                      : "text-[#596273] hover:bg-[#f4f6f9] hover:text-[#172033]"
                  )}
                >
                  <MaterialIcon
                    name={item.icon}
                    filled={isActive}
                    className="text-[21px]"
                  />
                  {item.label}
                  {item.value === "cancellations" && openCases > 0 ? (
                    <span className="ml-auto hidden min-w-5 rounded-full bg-[#1749d8] px-1.5 py-0.5 text-center text-[10px] leading-4 font-bold text-white lg:inline-block">
                      {openCases}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto hidden space-y-3 pt-6 lg:block">
            <div className="border-t border-[#e8ebf0] pt-5">
              <div className="rounded-md bg-[#13357b] p-4 text-white">
                <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-white/12">
                  <MaterialIcon name="support_agent" className="text-[21px]" />
                </div>
                <p className="text-sm font-semibold">Support coverage</p>
                <p className="mt-1.5 text-xs leading-5 text-white/72">
                  Manual cases remain open until refunds and customer updates
                  are complete.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  nativeButton={false}
                  className="mt-4 w-full bg-white text-[#13357b] hover:bg-white/90"
                  render={<Link href="/admin/settings" />}
                >
                  Edit support details
                </Button>
              </div>
            </div>
            <AdminSidebarProfile adminEmail={adminEmail} />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-[#dfe4ec] bg-white px-4 py-5 md:px-7 lg:px-8 lg:py-6">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold text-[#1749d8]">
                Vacatina admin
              </p>
              <h1 className="font-heading text-xl font-semibold text-[#111827] md:text-2xl">
                {title}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[#667085]">
                {description}
              </p>
            </div>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              className="hidden h-10 border-[#d7dce5] bg-white text-[#273142] md:inline-flex"
              render={<Link href="/" />}
            >
              <MaterialIcon name="open_in_new" className="text-[18px]" />
              View website
            </Button>
          </div>
        </header>

        <main
          className="px-4 py-5 md:px-7 md:py-7 lg:px-8"
          aria-label={`${title}: ${description}`}
        >
          <div className="mx-auto max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
