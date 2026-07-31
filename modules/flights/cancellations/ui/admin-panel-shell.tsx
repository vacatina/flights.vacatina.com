import Link from "next/link"
import {
  CalendarDaysIcon,
  GaugeIcon,
  LifeBuoyIcon,
  PlaneIcon,
  SettingsIcon,
  TicketCheckIcon,
} from "lucide-react"

import type { AdminCancellationQueueItem } from "@/modules/flights/cancellations/server/service"
import { AdminSidebarProfile } from "@/modules/flights/cancellations/ui/admin-sidebar-profile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AdminPanelShellProps {
  active: "dashboard" | "cancellations" | "settings"
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
    icon: GaugeIcon,
  },
  {
    href: "/admin/cancellations",
    label: "Cancellations",
    value: "cancellations",
    icon: TicketCheckIcon,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    value: "settings",
    icon: SettingsIcon,
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
  const rightRailItems = queueItems.slice(0, 5)
  const pendingCount = queueItems.filter((item) =>
    ["requested", "quote_ready", "admin_review_required"].includes(item.status)
  ).length

  return (
    <main className="h-svh overflow-hidden bg-background text-foreground">
      <div className="grid h-full min-h-0 w-full bg-background lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_300px]">
        <aside className="flex h-svh min-h-0 flex-col border-b border-border bg-card p-4 lg:sticky lg:top-0 lg:border-r lg:border-b-0">
          <Link href="/admin" className="mb-8 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PlaneIcon className="size-6" />
            </span>
            <span>
              <span className="block text-lg font-semibold leading-none">
                Vacatina
              </span>
              <span className="text-xs text-muted-foreground">
                Flight operations
              </span>
            </span>
          </Link>

          <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = active === item.value

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-4 hidden shrink-0 space-y-3 lg:block">
            <div className="space-y-3 rounded-lg bg-primary p-4 text-primary-foreground">
              <LifeBuoyIcon className="size-6" />
              <p className="text-sm font-semibold">Support coverage</p>
              <p className="text-xs text-primary-foreground/80">
                Manual cases stay visible until refund and customer messaging
                are complete.
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                render={<Link href="/admin/settings" />}
              >
                Edit details
              </Button>
            </div>
            <AdminSidebarProfile adminEmail={adminEmail} />
          </div>
        </aside>

        <section
          className="min-h-0 min-w-0 overflow-y-auto bg-muted/30 p-4 md:p-6"
          aria-label={`${title}: ${description}`}
        >
          {children}
        </section>

        <aside className="hidden h-svh min-h-0 overflow-y-auto border-l border-border bg-card p-5 xl:sticky xl:top-0 xl:block">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Review calendar</h2>
              <CalendarDaysIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-7 gap-1 rounded-lg border border-border p-3 text-center text-xs text-muted-foreground">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <span key={`${day}-${index}`} className="font-medium">
                  {day}
                </span>
              ))}
              {Array.from({ length: 35 }, (_, index) => {
                const day = index + 1
                const highlighted = [3, 9, 17, 24, 31].includes(day)
                return (
                  <span
                    key={day}
                    className={cn(
                      "rounded-md py-1",
                      highlighted && "bg-primary text-primary-foreground"
                    )}
                  >
                    {day}
                  </span>
                )
              })}
            </div>
          </section>

          <section className="mt-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Latest refunds</h2>
              <Badge variant="secondary">{pendingCount} open</Badge>
            </div>
            <div className="space-y-2">
              {rightRailItems.length === 0 ? (
                <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                  No refund reviews yet.
                </p>
              ) : null}
              {rightRailItems.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/admin/cancellations/${item.id}`}
                  className={cn(
                    "grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-muted",
                    index === 0 && "border-primary bg-primary text-primary-foreground hover:bg-primary"
                  )}
                >
                  <span>
                    <span className="block font-semibold">
                      {item.bookingReference}
                    </span>
                    <span
                      className={cn(
                        "block text-xs",
                        index === 0
                          ? "text-primary-foreground/75"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.statusLabel}
                    </span>
                  </span>
                  <span className="font-semibold">{item.refundLabel}</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
