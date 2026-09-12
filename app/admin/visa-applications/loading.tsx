import { Skeleton } from "@/components/ui/skeleton"

export default function AdminVisaApplicationsLoading() {
  return (
    <div className="space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-20" />
      <Skeleton className="h-96" />
    </div>
  )
}
