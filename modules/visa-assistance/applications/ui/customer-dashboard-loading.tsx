import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function CustomerVisaListSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading visa requests">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} size="sm">
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-12" />
              </div>
              <Skeleton className="size-10 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-col gap-3">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function CustomerVisaDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading visa request">
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <DetailCardSkeleton rows={2} />
          <DetailCardSkeleton rows={3} />
          <DetailCardSkeleton rows={2} />
        </div>
        <DetailCardSkeleton rows={4} />
      </div>
    </div>
  )
}

function DetailCardSkeleton({ rows }: { rows: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}
