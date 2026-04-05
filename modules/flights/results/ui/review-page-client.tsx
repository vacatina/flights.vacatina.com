"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, BriefcaseIcon, CheckIcon } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  toReviewUrlSearchParams,
  type ReviewPageData,
} from "@/modules/flights/results/domain"
import { logFlightFlow } from "@/modules/flights/shared/flow-debug"

export function ReviewPageClient({ data }: { data: ReviewPageData }) {
  const router = useRouter()

  useEffect(() => {
    logFlightFlow("ReviewPageClient", "hydrated", {
      partialOfferRequestId: data.partialOfferRequestId,
      totalLegs: data.totalLegs,
      selectedCount: data.state.selected.length,
      fareCount: data.state.fare.length,
      checkoutEnabled: data.summary.checkoutEnabled,
    })
  }, [
    data.partialOfferRequestId,
    data.state.selected.length,
    data.state.fare.length,
    data.summary.checkoutEnabled,
    data.totalLegs,
  ])

  function onSelectFare(legIndex: number, fareKey: string) {
    logFlightFlow("ReviewPageClient", "fare_selected", {
      partialOfferRequestId: data.partialOfferRequestId,
      legIndex,
      fareKey,
      fareCountBefore: data.state.fare.length,
    })
    const nextFare = [...data.state.fare.slice(0, legIndex), fareKey]
    const nextState = {
      ...data.state,
      fare: nextFare,
    }
    const query = toReviewUrlSearchParams(nextState).toString()

    logFlightFlow("ReviewPageClient", "navigate_with_fare_selection", {
      partialOfferRequestId: data.partialOfferRequestId,
      legIndex,
      nextFareCount: nextState.fare.length,
      query,
    })

    router.replace(`/results/${data.partialOfferRequestId}/review?${query}`)
  }

  function onGoToCheckout() {
    logFlightFlow("ReviewPageClient", "checkout_clicked", {
      partialOfferRequestId: data.partialOfferRequestId,
      checkoutEnabled: data.summary.checkoutEnabled,
      finalOfferId: data.summary.finalOfferId,
      selectedCount: data.state.selected.length,
    })

    if (!data.summary.checkoutEnabled || !data.summary.finalOfferId) {
      logFlightFlow("ReviewPageClient", "checkout_blocked_incomplete_state", {
        partialOfferRequestId: data.partialOfferRequestId,
      })
      return
    }

    const params = new URLSearchParams()
    params.set("offer", data.summary.finalOfferId)
    params.set("selected", data.state.selected.join(","))

    logFlightFlow("ReviewPageClient", "navigate_checkout", {
      partialOfferRequestId: data.partialOfferRequestId,
      query: params.toString(),
    })

    router.push(`/results/${data.partialOfferRequestId}/checkout?${params.toString()}`)
  }

  return (
    <main className="min-h-svh bg-muted/40 py-7 md:py-10">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-7 px-4 md:px-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Orders</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>New order</BreadcrumbLink>
            </BreadcrumbItem>
            {data.breadcrumbs.map((breadcrumb) => (
              <div key={breadcrumb} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink className="text-muted-foreground">
                    {breadcrumb}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </div>
            ))}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Fare options</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
          <div className="space-y-10">
            {data.legs.map((leg) => (
              <section key={leg.legIndex} className="space-y-4">
                <div className="space-y-3">
                  <p className="text-2xl font-semibold tracking-tight md:text-base">
                    {leg.title}
                    {leg.dateLabel ? (
                      <span className="ml-3 text-muted-foreground">{leg.dateLabel}</span>
                    ) : null}
                  </p>

                  <Card className="rounded-2xl border bg-card py-4 shadow-none">
                    <CardContent className="px-5 md:px-6">
                      <div className="grid gap-4 md:grid-cols-[auto_1fr_auto_auto] md:items-center">
                        <div className="flex size-12 items-center justify-center rounded-md border bg-muted/40">
                          {leg.header.ownerLogoSymbolUrl ? (
                            <Image
                              src={leg.header.ownerLogoSymbolUrl}
                              alt={`${leg.header.ownerName} logo`}
                              width={24}
                              height={24}
                              className="size-8 object-contain"
                              unoptimized
                            />
                          ) : (
                            <span className="text-xs font-semibold">
                              {leg.header.ownerName.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="grid gap-5 md:grid-cols-3 md:gap-8">
                          <div>
                            <p className="text-3xl font-semibold tracking-tight md:text-2xl">
                              {leg.header.departureTimeLabel} - {leg.header.arrivalTimeLabel}
                              {leg.header.arrivalDayOffset > 0
                                ? `+${leg.header.arrivalDayOffset}`
                                : ""}
                            </p>
                            <p className="text-sm text-muted-foreground md:text-base">
                              {leg.header.ownerName}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
                              Duration
                            </p>
                            <p className="text-xl font-semibold md:text-lg">
                              {leg.header.durationLabel}
                            </p>
                            <p className="text-sm text-muted-foreground md:text-base">
                              {leg.header.routeLabel}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
                              Stops
                            </p>
                            <p className="text-xl font-semibold md:text-lg">
                              {leg.header.stopsLabel}
                            </p>
                            <p className="text-sm text-muted-foreground md:text-base">
                              {leg.header.stopsDetails}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {leg.isLocked ? (
                  <p className="text-3xl text-muted-foreground md:text-base">{leg.lockMessage}</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {leg.options.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => onSelectFare(leg.legIndex, option.key)}
                        className="text-left"
                      >
                        <Card
                          className={cn(
                            "relative h-full cursor-pointer rounded-2xl border bg-card py-0 shadow-none transition-all",
                            option.isSelected
                              ? "border-primary ring-2 ring-primary/30"
                              : "hover:border-primary/40"
                          )}
                        >
                          {option.isSelected ? (
                            <span className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <CheckIcon className="size-4" />
                            </span>
                          ) : null}

                          <CardContent className="space-y-3 px-5 pt-5 pb-4 md:px-6">
                            <div>
                              <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
                                {option.cabinLabel}
                              </p>
                              <p className="text-3xl font-semibold tracking-tight md:text-xl">
                                {option.fareLabel}
                              </p>
                            </div>

                            <ul className="space-y-2 text-sm text-muted-foreground md:text-base">
                              {option.lines.map((line) => (
                                <li key={line.id} className="flex items-start gap-2">
                                  {(line.kind === "carry_on" || line.kind === "checked") && (
                                    <BriefcaseIcon className="mt-0.5 size-4" />
                                  )}
                                  <span>{line.label}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>

                          <div className="mt-auto flex items-end justify-between rounded-b-2xl bg-muted/40 px-5 py-4 md:px-6">
                            <p className="text-sm text-muted-foreground md:text-base">
                              total amount from
                            </p>
                            <p className="text-4xl font-semibold tracking-tight md:text-2xl">
                              {option.priceFromLabel}
                            </p>
                          </div>
                        </Card>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          <aside className="xl:sticky xl:top-6">
            <Card className="rounded-2xl bg-card/90 py-4 shadow-none">
              <CardHeader className="px-5 pb-4 md:px-6">
                <CardTitle className="text-2xl md:text-xl">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5 md:px-6">
                <p className="text-sm text-muted-foreground md:text-base">{data.summary.soldByLabel}</p>

                <Separator />

                <ul className="space-y-2 text-sm text-muted-foreground md:text-base">
                  {data.summary.conditions.map((condition) => (
                    <li key={condition}>{condition}</li>
                  ))}
                  <li>{data.summary.co2Label}</li>
                </ul>

                <Separator />

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground md:text-base">total amount</p>
                  <p className="text-4xl font-semibold tracking-tight md:text-2xl">
                    {data.summary.totalAmountLabel ?? "--"}
                  </p>
                </div>

                <Button
                  className="h-12 w-full rounded-xl text-sm md:text-base"
                  disabled={!data.summary.checkoutEnabled}
                  onClick={onGoToCheckout}
                >
                  Go to checkout
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>

                <p className="text-sm text-muted-foreground italic md:text-base">
                  {data.summary.helperText}
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  )
}
