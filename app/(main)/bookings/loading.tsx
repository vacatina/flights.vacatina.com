import { Skeleton } from "@/components/ui/skeleton"
import { CustomerDashboardHeader } from "@/components/customer-dashboard/customer-dashboard-header"

export default function BookingsLoadingPage() {
  return (
    <main className="min-h-svh bg-muted/40 py-8 md:py-10">
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 md:px-8">
        <CustomerDashboardHeader activeSection="bookings" />

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="space-y-3 lg:hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`mobile-skeleton-${index}`}
              className="space-y-3 rounded-xl border border-border bg-card p-5"
            >
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-9 w-32" />
            </div>
          ))}
        </div>

        <div className="hidden rounded-xl border border-border bg-card p-4 lg:block">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`desktop-skeleton-${index}`}
                className="grid grid-cols-8 gap-3"
              >
                <Skeleton className="col-span-2 h-12 w-full" />
                <Skeleton className="col-span-2 h-12 w-full" />
                <Skeleton className="col-span-1 h-12 w-full" />
                <Skeleton className="col-span-1 h-12 w-full" />
                <Skeleton className="col-span-1 h-12 w-full" />
                <Skeleton className="col-span-1 h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
