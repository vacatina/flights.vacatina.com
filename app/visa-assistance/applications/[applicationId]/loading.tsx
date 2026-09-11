import { Skeleton } from "@/components/ui/skeleton"

export default function VisaApplicationLoading() {
  return (
    <main className="min-h-[calc(100svh-5rem)] bg-[#f5f7fb] py-12">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 md:px-8">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-3 w-full" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[520px] w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    </main>
  )
}
