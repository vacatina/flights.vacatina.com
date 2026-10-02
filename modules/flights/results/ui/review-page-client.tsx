"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Show } from "@clerk/nextjs"
import { ArrowRightIcon, BriefcaseIcon, CheckIcon, Loader2Icon } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  toReviewUrlSearchParams,
  type ReviewPageData,
} from "@/modules/flights/results/domain"
import { createCheckoutQuoteAction } from "@/modules/flights/results/server/actions"
import {
  OfferSessionTimer,
  useOfferSessionExpiry,
} from "@/modules/flights/results/ui/offer-session-timer"
import { logFlightFlow } from "@/lib/logging/flow-debug"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"
import { FxEstimateDisclosure, Money } from "@/modules/currency/ui"

const REVIEW_FOCUS_LEG_QUERY_PARAM = "focusLeg"

export function ReviewPageClient({ data }: { data: ReviewPageData }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const [isSelectingFare, startSelectingFare] = useTransition()
  const [pendingFareSelection, setPendingFareSelection] = useState<string | null>(null)
  const [isCreatingQuote, startCreatingQuote] = useTransition()
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const legSectionRefs = useRef(new Map<number, HTMLElement>())
  const focusLegIndex = parseFocusLegIndex(
    searchParams.get(REVIEW_FOCUS_LEG_QUERY_PARAM)
  )
  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(buildRedirectPath(pathname, searchParams.toString()))}`
  const offerSession = useOfferSessionExpiry(data.offerExpiresAtIso)

  const setLegSectionRef = useCallback((legIndex: number, node: HTMLElement | null) => {
    if (node) {
      legSectionRefs.current.set(legIndex, node)
      return
    }

    legSectionRefs.current.delete(legIndex)
  }, [])

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

  useEffect(() => {
    if (focusLegIndex === null) {
      return
    }

    const targetLeg = data.legs.find((leg) => leg.legIndex === focusLegIndex)

    if (!targetLeg || targetLeg.isLocked) {
      return
    }

    const sectionNode = legSectionRefs.current.get(focusLegIndex)

    if (!sectionNode) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      sectionNode.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })

      const firstOptionButton = sectionNode.querySelector<HTMLButtonElement>(
        "button[data-review-fare-option='true']"
      )
      firstOptionButton?.focus({ preventScroll: true })

      logFlightFlow("ReviewPageClient", "auto_scrolled_to_next_leg", {
        partialOfferRequestId: data.partialOfferRequestId,
        nextLegIndex: focusLegIndex,
      })

      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete(REVIEW_FOCUS_LEG_QUERY_PARAM)
      const nextQuery = nextParams.toString()
      const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname

      router.replace(nextHref, { scroll: false })
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [
    data.legs,
    data.partialOfferRequestId,
    focusLegIndex,
    pathname,
    router,
    searchParams,
  ])

  function onSelectFare(legIndex: number, fareKey: string) {
    if (isSelectingFare) {
      return
    }

    const selectionKey = `${legIndex}:${fareKey}`
    setPendingFareSelection(selectionKey)

    logFlightFlow("ReviewPageClient", "fare_selected", {
      partialOfferRequestId: data.partialOfferRequestId,
      legIndex,
      fareKey,
      fareCountBefore: data.state.fare.length,
    })
    const nextFare = [...data.state.fare.slice(0, legIndex), fareKey]
    const nextLegIndex = legIndex + 1
    const nextState = {
      ...data.state,
      fare: nextFare,
    }
    const nextParams = toReviewUrlSearchParams(nextState)

    if (nextLegIndex < data.totalLegs) {
      nextParams.set(REVIEW_FOCUS_LEG_QUERY_PARAM, String(nextLegIndex))
    }

    const query = nextParams.toString()

    logFlightFlow("ReviewPageClient", "navigate_with_fare_selection", {
      partialOfferRequestId: data.partialOfferRequestId,
      legIndex,
      nextFareCount: nextState.fare.length,
    })

    startSelectingFare(() => {
      router.replace(`/results/${data.partialOfferRequestId}/review?${query}`)
    })
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

    if (offerSession.expired) {
      setCheckoutError("This search has expired. Start a fresh search before checkout.")
      return
    }

    const finalOfferId = data.summary.finalOfferId
    setCheckoutError(null)

    startCreatingQuote(() => {
      void (async () => {
        const result = await createCheckoutQuoteAction({
          partialOfferRequestId: data.partialOfferRequestId,
          selected: data.state.selected,
          offerId: finalOfferId,
        })

        if (!result.ok) {
          logFlightFlow("ReviewPageClient", "checkout_quote_failed", {
            partialOfferRequestId: data.partialOfferRequestId,
            code: result.error.code,
          })
          setCheckoutError(
            toSafeUserErrorMessage(
              result.error.message,
              "Unable to start checkout right now. Please try again."
            )
          )
          return
        }

        const params = new URLSearchParams()
        params.set("offer", finalOfferId)
        params.set("selected", data.state.selected.join(","))
        params.set("quote", result.data.quoteId)

        logFlightFlow("ReviewPageClient", "navigate_checkout", {
          partialOfferRequestId: data.partialOfferRequestId,
          selectedCount: data.state.selected.length,
          quoteId: result.data.quoteId,
        })

        router.push(`/results/${data.partialOfferRequestId}/checkout?${params.toString()}`)
      })()
    })
  }

  return (
    <main className="min-h-svh bg-muted/40 py-7 md:py-10">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-7 px-4 md:px-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Flights</BreadcrumbLink>
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

        <OfferSessionTimer
          expiresAtIso={data.offerExpiresAtIso}
          expiresAtLabel={data.offerExpiresAtLabel}
        />
        <FxEstimateDisclosure
          sourceCurrencies={[
            ...(data.summary.totalMoney
              ? [data.summary.totalMoney.currency]
              : []),
            ...data.legs.flatMap((leg) =>
              leg.options.map((option) => option.currency)
            ),
          ]}
        />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
          <div className="space-y-10">
            {data.legs.map((leg) => (
              <section
                key={leg.legIndex}
                ref={(node) => setLegSectionRef(leg.legIndex, node)}
                data-review-leg={leg.legIndex}
                className="space-y-4 scroll-mt-24"
              >
                <div className="space-y-3">
                  <p className="text-xl font-semibold tracking-tight md:text-2xl">
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
                            <p className="text-2xl font-semibold tracking-tight md:text-3xl">
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
                  <p className="text-base text-muted-foreground md:text-lg">{leg.lockMessage}</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {leg.options.map((option) => {
                      const selectionKey = `${leg.legIndex}:${option.key}`
                      const isPendingSelection =
                        isSelectingFare && pendingFareSelection === selectionKey

                      return (
                        <button
                          key={option.key}
                          type="button"
                          data-review-fare-option="true"
                          disabled={isSelectingFare}
                          aria-busy={isPendingSelection}
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
                            {isPendingSelection ? (
                              <span className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Loader2Icon className="size-3.5 animate-spin" />

                              </span>
                            ) : option.isSelected ? (
                              <span className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <CheckIcon className="size-4" />
                              </span>
                            ) : null}

                            <CardContent className="space-y-3 px-5 pt-5 pb-4 md:px-6">
                              <div>
                                <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
                                  {option.cabinLabel}
                                </p>
                                <p className="text-xl font-semibold tracking-tight md:text-3xl">
                                  {option.fareLabel}
                                </p>
                              </div>

                              <ul className="space-y-2 text-sm text-muted-foreground md:text-base">
                                {option.lines.map((line) => (
                                  <li key={line.id} className="flex items-start gap-2">
                                    {(line.kind === "carry_on" ||
                                      line.kind === "checked") && (
                                        <BriefcaseIcon className="mt-0.5 size-4" />
                                      )}
                                    <span>
                                      {line.money ? (
                                        <>
                                          {line.prefix}
                                          <Money money={line.money} />
                                          {line.suffix}
                                        </>
                                      ) : (
                                        line.label
                                      )}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>

                            <div className="mt-auto flex flex-col items-start gap-1 rounded-b-2xl bg-muted/40 px-5 py-4 md:px-6">
                              <p className="text-xs tracking-wider uppercase text-muted-foreground md:text-sm">
                                Total from
                              </p>
                              <p className="w-full text-2xl font-semibold tracking-tight md:text-3xl break-words">
                                <Money
                                  money={option.priceFromMoney}
                                  fallbackLabel={option.priceFromLabel}
                                />
                              </p>
                            </div>
                          </Card>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>

          <aside className="xl:sticky xl:top-6">
            <Card className="rounded-2xl bg-card/90 py-4 shadow-none">
              <CardHeader className="px-5 pb-4 md:px-6">
                <CardTitle className="text-xl md:text-2xl">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5 md:px-6">
                <p className="text-sm text-muted-foreground md:text-base">{data.summary.soldByLabel}</p>

                <Separator />

                <ul className="space-y-2 text-sm text-muted-foreground md:text-base">
                  {data.summary.conditions.map((condition) => (
                    <li className="list-disc ml-4" key={condition.id}>
                      {condition.money ? (
                        <>
                          {condition.prefix}
                          <Money money={condition.money} />
                          {condition.suffix}
                        </>
                      ) : (
                        condition.label
                      )}
                    </li>
                  ))}
                  <li className="list-disc ml-4">{data.summary.co2Label}</li>
                </ul>

                <Separator />

                <div className="space-y-1">
                  <p className="text-sm font-medium tracking-wide uppercase text-muted-foreground md:text-base">Total Amount</p>
                  <p className="text-2xl font-semibold tracking-tight md:text-3xl">
                    {data.summary.totalMoney ? (
                      <Money
                        money={data.summary.totalMoney}
                        fallbackLabel={data.summary.totalAmountLabel}
                      />
                    ) : (
                      "--"
                    )}
                  </p>
                </div>

                <LoadingButton
                  className="h-12 w-full rounded-xl text-sm md:text-base"
                  disabled={
                    !data.summary.checkoutEnabled ||
                    isCreatingQuote ||
                    offerSession.expired
                  }
                  isLoading={isCreatingQuote}
                  isError={!!checkoutError}
                  onClick={onGoToCheckout}
                >
                  Go to checkout
                </LoadingButton>

                {checkoutError ? (
                  <p className="text-sm text-destructive md:text-base">{checkoutError}</p>
                ) : null}

                <p className="text-sm text-muted-foreground italic md:text-base">
                  {data.summary.helperText}
                </p>

                {clerkEnabled ? (
                  <Show when="signed-out">
                    <p className="text-sm text-muted-foreground md:text-base">
                      Sign in for faster checkout and order history.{" "}
                      <Link
                        href={signInHref}
                        className="text-primary underline underline-offset-4"
                      >
                        Sign in
                      </Link>
                    </p>
                  </Show>
                ) : null}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  )
}

function buildRedirectPath(pathname: string | null, search: string) {
  const normalizedPathname = pathname || "/"

  if (!search) {
    return normalizedPathname
  }

  return `${normalizedPathname}?${search}`
}

function parseFocusLegIndex(rawValue: string | null): number | null {
  if (!rawValue) {
    return null
  }

  const parsed = Number.parseInt(rawValue, 10)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}
