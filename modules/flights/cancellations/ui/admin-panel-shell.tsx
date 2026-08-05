import Link from "next/link"
import {
  GaugeIcon,
  LifeBuoyIcon,
  PlaneIcon,
  SettingsIcon,
  TicketCheckIcon,
} from "lucide-react"

import type { AdminCancellationQueueItem } from "@/modules/flights/cancellations/server/service"
import { AdminSidebarProfile } from "@/modules/flights/cancellations/ui/admin-sidebar-profile"
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
  children,
}: AdminPanelShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen w-full bg-background lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="flex flex-col border-b border-border bg-card p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:border-b-0">
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

          <nav className="min-h-0 flex-1 space-y-2 pr-1">
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

        <main
          className="min-w-0 bg-muted/30 p-4 md:p-6"
          aria-label={`${title}: ${description}`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}


