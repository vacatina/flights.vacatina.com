import { Skeleton } from "@/components/ui/skeleton"

export function HotelCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border sm:flex-row w-full">
      <Skeleton className="h-48 w-full shrink-0 sm:h-[220px] sm:w-72 rounded-none" />

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="w-full">
            <div className="flex items-center gap-1 mb-2">
               <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-7 w-3/4 mb-3 max-w-[300px]" />
            <div className="flex items-start gap-2 mt-2">
               <Skeleton className="h-4 w-4 shrink-0" />
               <Skeleton className="h-4 w-full max-w-[200px]" />
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
             <Skeleton className="h-4 w-12" />
             <Skeleton className="h-8 w-24" />
             <Skeleton className="h-3 w-20" />
          </div>
        </div>

        <div className="mt-auto pt-6 flex items-end justify-between">
          <div className="flex gap-2">
             <Skeleton className="h-6 w-16 rounded-md" />
             <Skeleton className="h-6 w-20 rounded-md" />
          </div>
          
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export function HotelResultsSkeleton() {
  return (
    <div className="flex flex-col items-start gap-8 lg:flex-row w-full">
      {/* Sidebar Filters Skeleton */}
      <div className="w-full shrink-0 flex-col gap-6 lg:flex lg:w-72">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border">
          <Skeleton className="mb-6 h-6 w-24 rounded-md" />
          <div className="space-y-4">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-8 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Results Skeleton */}
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-10 w-[180px] rounded-md" />
        </div>

        <div className="grid gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <HotelCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
