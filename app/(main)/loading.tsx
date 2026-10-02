import { Skeleton } from "@/components/ui/skeleton"

export default function RootLoading() {
  return (
    <main className="bg-muted">
      <section className="relative isolate -mt-[90px] flex h-fit min-h-[100dvh] md:h-[100dvh] md:min-h-[700px] flex-col overflow-hidden pb-10 pt-[90px]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#5f83a8] via-[#e8a878] via-55% to-[#1a2a3d]" />
        <div className="absolute inset-0 bg-[#05103680]" />

        <div className="relative mx-auto flex w-full max-w-screen-2xl flex-1 min-h-0 flex-col px-4 pt-6 md:px-8 md:pt-14 lg:px-12 lg:pt-16">
          <div className="mx-auto max-w-4xl shrink-0 text-center text-white">
            <h1 className="text-[54px] font-semibold tracking-[-0.02em] leading-14 text-balance md:text-[56px]">
              Book Everything in One Place
            </h1>
            <p className="mt-4 text-[18px] text-balance text-white/85 md:text-[19px]">
              Book flights, hotels, cruises, cars, and experiences-all from one
              place.
            </p>
          </div>

          <div className="mx-auto mb-10 mt-8 flex w-full max-w-screen-2xl flex-1 min-h-0 flex-col md:mt-10">
            <div className="flex w-full h-fit flex-col gap-8 rounded-[12px] border border-border bg-background p-4 shadow-xl md:gap-9 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <Skeleton className="h-12 w-full md:w-[400px] rounded-[12px]" />
              </div>
              
              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_68px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Skeleton className="h-[76px] w-full rounded-xl" />
                <div className="hidden xl:flex xl:justify-center xl:pt-8">
                  <Skeleton className="size-[56px] rounded-xl" />
                </div>
                <Skeleton className="h-[76px] w-full rounded-xl" />
                <Skeleton className="h-[76px] w-full rounded-xl" />
                <Skeleton className="h-[76px] w-full rounded-xl" />
              </div>

              <div className="h-px w-full bg-border" />
              
              <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] xl:items-end">
                <Skeleton className="h-[76px] w-full rounded-xl" />
                <Skeleton className="h-[76px] w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-[10px]" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
