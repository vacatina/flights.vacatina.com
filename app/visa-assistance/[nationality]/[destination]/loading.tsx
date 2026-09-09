import { Skeleton } from "@/components/ui/skeleton"

export default function VisaDetailsLoading() {
  return (
    <main className="bg-background">
      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-12 lg:py-20">
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-6 h-14 w-full max-w-lg" />
          <Skeleton className="mt-4 h-6 w-full max-w-md" />
          <Skeleton className="mt-8 h-11 w-full max-w-sm" />
        </div>
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      </section>

      <div className="border-t bg-muted/20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 md:px-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14 lg:px-12">
          <div className="space-y-10">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-52 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    </main>
  )
}
