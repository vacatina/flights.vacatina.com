import Link from "next/link"
import { FileTextIcon, PlaneTakeoffIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type DashboardSection = "bookings" | "visa-requests"

export function CustomerDashboardHeader({
  activeSection,
}: {
  activeSection: DashboardSection
}) {
  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Travel dashboard
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          My trips and requests
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Keep track of your bookings and visa assistance in one place.
        </p>
      </div>

      <nav
        className="flex gap-2 overflow-x-auto pb-1"
        aria-label="Customer dashboard"
      >
        <Button
          size="lg"
          variant={activeSection === "bookings" ? "secondary" : "ghost"}
          nativeButton={false}
          render={
            <Link
              href="/bookings"
              aria-current={activeSection === "bookings" ? "page" : undefined}
            />
          }
        >
          <PlaneTakeoffIcon data-icon="inline-start" />
          Flight bookings
        </Button>
        <Button
          size="lg"
          variant={activeSection === "visa-requests" ? "secondary" : "ghost"}
          nativeButton={false}
          render={
            <Link
              href="/visa-requests"
              aria-current={
                activeSection === "visa-requests" ? "page" : undefined
              }
            />
          }
        >
          <FileTextIcon data-icon="inline-start" />
          Visa requests
        </Button>
      </nav>
    </header>
  )
}
