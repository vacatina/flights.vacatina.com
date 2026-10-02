import { Skeleton } from "@/components/ui/skeleton"

export function PublicVisaLoading() {
  return (
    <main aria-busy="true" aria-label="Loading visa services">
      <span role="status" className="sr-only">
        Loading visa services…
      </span>
      <div className="border-b bg-muted/30">
        <div className="w-full mx-auto flex max-w-screen-2xl flex-col gap-5 px-4 py-10 md:px-8 md:py-14">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-5 w-full max-w-2xl" />
          <Skeleton className="h-12 w-full max-w-md" />
        </div>
      </div>
      <div className="w-full mx-auto grid max-w-screen-2xl gap-6 px-4 py-10 md:grid-cols-2 md:px-8">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="flex flex-col gap-6 rounded-xl border p-6"
          >
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </main>
  )
}
