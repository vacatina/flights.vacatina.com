"use client"

import Link from "next/link"
import Image from "next/image"
import { useCallback, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  BriefcaseIcon,
  FilterIcon,
  Loader2Icon,
  PlaneLandingIcon,
  PlaneTakeoffIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  applyOfferClientSorting,
  toResultsUrlSearchParams,
  type FareOptionsPageData,
} from "@/modules/flights/results/domain"
import { loadMoreFareOptionsAction } from "@/modules/flights/results/server/actions"
import { logFlightFlow } from "@/lib/logging/flow-debug"
import { cn } from "@/lib/utils"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"

const SORT_OPTIONS = [
  { value: "least_expensive", label: "Least expensive" },
  { value: "most_expensive", label: "Most expensive" },
  { value: "shortest_duration", label: "Shortest duration" },
  { value: "longest_duration", label: "Longest duration" },
] as const

const STOPS_OPTIONS = [
  { value: "direct", label: "Direct only" },
  { value: "max_1", label: "1 stop at most" },
  { value: "max_2", label: "2 stops at most" },
  { value: "any", label: "Any number of stops" },
] as const
const FILTER_DEBOUNCE_MS = 300

export function FareOptionsPageClient({ data }: { data: FareOptionsPageData }) {
  const router = useRouter()
  const [offers, setOffers] = useState(data.offers)
  const [nextAfter, setNextAfter] = useState<string | null>(data.after)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [isFilterDialogOpen, setFilterDialogOpen] = useState(false)
  const [isLoadingMore, startLoadingMore] = useTransition()
  const [isSelectingOffer, startSelectingOffer] = useTransition()
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null)
  const [draftFlightNumber, setDraftFlightNumber] = useState(
    data.state.flightNumber ?? ""
  )
  const [draftTakeoffRange, setDraftTakeoffRange] = useState<[number, number]>([
    data.state.takeoffFrom,
    data.state.takeoffTo,
  ])
  const [draftLandingRange, setDraftLandingRange] = useState<[number, number]>([
    data.state.landingFrom,
    data.state.landingTo,
  ])

  const updateQuery = useCallback(function updateQuery(
    patch: Partial<Omit<FareOptionsPageData["state"], "selected">> & {
      selected?: string[]
    }
  ) {
    const nextState = {
      ...data.state,
      ...patch,
      after: undefined,
      selected: patch.selected ?? data.state.selected,
    }

    if (isResultsStateEqual(nextState, data.state)) {
      return
    }

    const search = toResultsUrlSearchParams(nextState).toString()
    router.replace(
      `/results/${data.partialOfferRequestId}/fare-options?${search}`
    )
  }, [data.partialOfferRequestId, data.state, router])

  useEffect(() => {
    const nextValue = data.state.flightNumber ?? ""
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftFlightNumber((current) =>
      current === nextValue ? current : nextValue
    )
  }, [data.state.flightNumber])

  useEffect(() => {
    const nextRange: [number, number] = [data.state.takeoffFrom, data.state.takeoffTo]
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftTakeoffRange((current) => (sameRange(current, nextRange) ? current : nextRange))
  }, [data.state.takeoffFrom, data.state.takeoffTo])

  useEffect(() => {
    const nextRange: [number, number] = [data.state.landingFrom, data.state.landingTo]
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftLandingRange((current) => (sameRange(current, nextRange) ? current : nextRange))
  }, [data.state.landingFrom, data.state.landingTo])

  useEffect(() => {
    const normalizedDraft = draftFlightNumber.trim() || undefined

    if (normalizedDraft === data.state.flightNumber) {
      return
    }

    const timeout = window.setTimeout(() => {
      updateQuery({ flightNumber: normalizedDraft })
    }, FILTER_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [data.state.flightNumber, draftFlightNumber, updateQuery])

  useEffect(() => {
    if (
      sameRange(draftTakeoffRange, [data.state.takeoffFrom, data.state.takeoffTo])
    ) {
      return
    }

    const timeout = window.setTimeout(() => {
      updateQuery({
        takeoffFrom: draftTakeoffRange[0],
        takeoffTo: draftTakeoffRange[1],
      })
    }, FILTER_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [
    data.state.takeoffFrom,
    data.state.takeoffTo,
    draftTakeoffRange,
    updateQuery,
  ])

  useEffect(() => {
    if (
      sameRange(draftLandingRange, [data.state.landingFrom, data.state.landingTo])
    ) {
      return
    }

    const timeout = window.setTimeout(() => {
      updateQuery({
        landingFrom: draftLandingRange[0],
        landingTo: draftLandingRange[1],
      })
    }, FILTER_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [
    data.state.landingFrom,
    data.state.landingTo,
    draftLandingRange,
    updateQuery,
  ])

  function selectOffer(offerId: string) {
    if (isSelectingOffer) {
      return
    }

    setPendingOfferId(offerId)

    logFlightFlow("FareOptionsPageClient", "offer_selected", {
      partialOfferRequestId: data.partialOfferRequestId,
      leg: data.leg,
      offerId,
      selectedCountBefore: data.selected.length,
    })
    const nextSelected = [...data.selected, offerId]

    startSelectingOffer(() => {
      if (data.leg < data.totalLegs - 1) {
        const nextState = {
          ...data.state,
          leg: data.leg + 1,
          selected: nextSelected,
          after: undefined,
        }
        const search = toResultsUrlSearchParams(nextState).toString()
        logFlightFlow("FareOptionsPageClient", "navigate_next_leg", {
          partialOfferRequestId: data.partialOfferRequestId,
          nextLeg: nextState.leg,
          selectedCount: nextSelected.length,
        })
        router.push(
          `/results/${data.partialOfferRequestId}/fare-options?${search}`
        )
        return
      }

      const params = new URLSearchParams()
      params.set("selected", nextSelected.join(","))
      logFlightFlow("FareOptionsPageClient", "navigate_review", {
        partialOfferRequestId: data.partialOfferRequestId,
        selectedCount: nextSelected.length,
      })
      router.push(
        `/results/${data.partialOfferRequestId}/review?${params.toString()}`
      )
    })
  }

  function loadMore() {
    if (!nextAfter) {
      logFlightFlow("FareOptionsPageClient", "load_more_skipped_no_cursor", {
        partialOfferRequestId: data.partialOfferRequestId,
      })
      return
    }

    logFlightFlow("FareOptionsPageClient", "load_more_requested", {
      partialOfferRequestId: data.partialOfferRequestId,
      after: nextAfter,
      currentOfferCount: offers.length,
    })
    startLoadingMore(() => {
      void (async () => {
        const result = await loadMoreFareOptionsAction({
          partialOfferRequestId: data.partialOfferRequestId,
          state: {
            ...data.state,
            after: nextAfter,
          },
        })

        if (!result.ok) {
          logFlightFlow("FareOptionsPageClient", "load_more_failed", {
            partialOfferRequestId: data.partialOfferRequestId,
            after: nextAfter,
            code: result.error.code,
          })
          setLoadMoreError(
            toSafeUserErrorMessage(
              result.error.message,
              "Unable to load more fares right now. Please try again."
            )
          )
          return
        }

        logFlightFlow("FareOptionsPageClient", "load_more_succeeded", {
          partialOfferRequestId: data.partialOfferRequestId,
          loadedOfferCount: result.data.offers.length,
          nextAfter: result.data.after,
        })
        setOffers((current) => {
          const deduped = new Map(current.map((offer) => [offer.id, offer]))

          for (const offer of result.data.offers) {
            deduped.set(offer.id, offer)
          }

          return applyOfferClientSorting(
            Array.from(deduped.values()),
            data.state.sort
          )
        })
        setNextAfter(result.data.after)
        setLoadMoreError(null)
      })()
    })
  }

  return (
    <main className="min-h-svh bg-muted/40 py-7 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 md:px-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Orders</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>
                New order
              </BreadcrumbLink>
            </BreadcrumbItem>
            {data.breadcrumbs.map((breadcrumb, index) => (
              <div key={breadcrumb} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {index === data.leg ? (
                    <BreadcrumbPage>{breadcrumb}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink className="text-muted-foreground">
                      {breadcrumb}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Fare options</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="lg:hidden">
          <Dialog open={isFilterDialogOpen} onOpenChange={setFilterDialogOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" className="w-full justify-start">
                  <FilterIcon data-icon="inline-start" />
                  Filters and sorting
                </Button>
              }
            />
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Filters and sorting</DialogTitle>
              </DialogHeader>
              <FiltersSidebar
                data={data}
                onChange={updateQuery}
                flightNumberValue={draftFlightNumber}
                onFlightNumberChange={setDraftFlightNumber}
                takeoffRange={draftTakeoffRange}
                onTakeoffRangeChange={setDraftTakeoffRange}
                landingRange={draftLandingRange}
                onLandingRangeChange={setDraftLandingRange}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid items-start gap-7 lg:grid-cols-[320px_1fr]">
          <aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
            <div className="max-h-[calc(100svh-3rem)] overflow-y-auto pr-2">
              <FiltersSidebar
                data={data}
                onChange={updateQuery}
                flightNumberValue={draftFlightNumber}
                onFlightNumberChange={setDraftFlightNumber}
                takeoffRange={draftTakeoffRange}
                onTakeoffRangeChange={setDraftTakeoffRange}
                landingRange={draftLandingRange}
                onLandingRangeChange={setDraftLandingRange}
              />
            </div>
          </aside>

          <section className="flex flex-col gap-6">
            {offers.length === 0 && (
              <Card className="rounded-2xl">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No fares match these filters.
                </CardContent>
              </Card>
            )}

            {offers.length > 0 && (
              <Accordion multiple className="gap-5">
                {offers.map((offer) => (
                  <Card
                    key={offer.id}
                    className="group/card overflow-hidden rounded-2xl border bg-card/95 transition-shadow duration-200 hover:shadow-md"
                  >
                    <AccordionItem value={offer.id} className="border-b-0">
                      <CardHeader className="p-0">
                        <AccordionTrigger className="w-full px-6 py-5 no-underline hover:no-underline md:px-8 md:py-5">
                          <div className="grid w-full gap-8 text-left md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,1fr)]">
                            <div className="flex items-center gap-5">
                              <div className="flex size-18 items-center justify-center rounded-lg border bg-muted/50 font-semibold text-primary">
                                {offer.ownerLogoSymbolUrl ? (
                                  <Image
                                    src={offer.ownerLogoSymbolUrl}
                                    alt={`${offer.ownerName} logo`}
                                    width={32}
                                    height={32}
                                    unoptimized
                                    className="size-12 object-contain"
                                  />
                                ) : (
                                  offer.ownerCode
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-lg leading-tight font-semibold tracking-tight md:text-xl">
                                  {offer.departureTimeLabel} -{" "}
                                  {offer.arrivalTimeLabel}
                                  {offer.arrivalDayOffset > 0 &&
                                    `+${offer.arrivalDayOffset}`}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {offer.flightNumbersLabel.includes(",")
                                    ? `${offer.ownerName} · ${offer.flightNumbersLabel}`
                                    : offer.ownerName}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                                Total duration
                              </span>
                              <span className="text-lg leading-tight font-semibold tracking-tight md:text-xl">
                                {offer.durationLabel}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {offer.routeLabel}
                              </span>
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                                Stops
                              </span>
                              <span className="text-lg leading-tight font-semibold tracking-tight md:text-xl">
                                {offer.stopsLabel}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {offer.stopsDetails ?? "Direct flight"}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                      </CardHeader>

                      <AccordionContent className="px-6 md:px-10">
                        <div className="pb-6">
                          {offer.timeline.map((departureEvent, eventIndex) => {
                            if (eventIndex % 2 === 1) {
                              return null
                            }

                            const arrivalEvent = offer.timeline[eventIndex + 1]

                            if (!arrivalEvent) {
                              return null
                            }

                            const segmentIndex = Math.floor(eventIndex / 2)
                            const layover = offer.layovers[segmentIndex]

                            return (
                              <div
                                key={`${departureEvent.id}-${arrivalEvent.id}`}
                                className="pb-10 last:pb-2"
                              >
                                <div className="relative px-1 py-3 md:px-2">
                                  <div className="absolute top-6 bottom-6 left-3 border-l border-dashed border-border" />
                                  <span className="absolute top-0 left-0 size-6 rounded-full border-2 border-muted-foreground/35 bg-background" />
                                  <span className="absolute bottom-0 left-0 size-6 rounded-full border-2 border-muted-foreground/35 bg-background" />

                                  <div className="flex flex-col gap-5 pl-12">
                                    <div className="grid items-start gap-3 md:grid-cols-[310px_1fr]">
                                      <strong className="text-base leading-tight font-semibold md:text-lg">
                                        {departureEvent.dateTimeLabel}
                                      </strong>
                                      <span className="text-sm text-foreground md:text-base">
                                        {departureEvent.description}
                                      </span>
                                    </div>

                                    {departureEvent.segmentDurationLabel && (
                                      <p className="text-sm text-muted-foreground md:text-base">
                                        Flight duration:{" "}
                                        {departureEvent.segmentDurationLabel}
                                      </p>
                                    )}

                                    <div className="grid items-start gap-3 pt-4 md:grid-cols-[310px_1fr]">
                                      <strong className="text-base leading-tight font-semibold md:text-lg">
                                        {arrivalEvent.dateTimeLabel}
                                      </strong>
                                      <span className="text-sm text-foreground md:text-base">
                                        {arrivalEvent.description}
                                      </span>
                                    </div>

                                    {arrivalEvent.meta.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-muted-foreground md:text-base">
                                        {arrivalEvent.meta.map((metaItem) => (
                                          <span
                                            key={metaItem}
                                            className="inline-flex items-center gap-2"
                                          >
                                            {(metaItem.includes("carry-on") ||
                                              metaItem.includes("checked")) && (
                                              <BriefcaseIcon className="size-4" />
                                            )}
                                            {metaItem}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {layover && (
                                  <Badge
                                    variant="secondary"
                                    className="mt-5 ml-12 w-fit rounded-full px-5 py-1.5 text-sm font-normal md:text-base"
                                  >
                                    {layover.label}
                                  </Badge>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <Separator />

                    <CardFooter className="flex items-center justify-between px-6 py-5 md:px-10 md:py-6">
                      <div className="flex flex-col">
                        <p
                          className={cn(
                            "text-sm text-muted-foreground",
                            offer.isExpired ? "opacity-80" : ""
                          )}
                        >
                          From{" "}
                          <span
                            className={cn(
                              "text-3xl font-semibold tracking-tight text-foreground md:text-4xl",
                              offer.isExpired ? "text-muted-foreground" : ""
                            )}
                          >
                            {offer.totalAmountLabel}
                          </span>
                        </p>
                        {!offer.isExpired && (
                          <span className="text-xs text-muted-foreground">
                            Includes taxes and fees
                          </span>
                        )}
                      </div>
                      {offer.isExpired ? (
                        <div className="inline-flex items-center gap-3 rounded-full bg-muted px-4 py-2 text-foreground">
                          <AlertCircleIcon className="size-4" />
                          <span className="text-sm md:text-base">
                            Offer expired
                          </span>
                        </div>
                      ) : (
                        <Button
                          className="h-11 rounded-xl px-7 text-sm"
                          disabled={isSelectingOffer}
                          onClick={() => selectOffer(offer.id)}
                        >
                          {isSelectingOffer && pendingOfferId === offer.id ? (
                            <Loader2Icon
                              data-icon="inline-start"
                              className="size-4 animate-spin"
                            />
                          ) : null}
                          Select
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </Accordion>
            )}

            {(nextAfter || isLoadingMore) && (
              <Pagination className="justify-start">
                <Button
                  variant="outline"
                  className="rounded-xl px-6"
                  disabled={!nextAfter || isLoadingMore}
                  onClick={loadMore}
                >
                  {isLoadingMore ? "Loading..." : "Load more"}
                </Button>
              </Pagination>
            )}

            {isLoadingMore && (
              <div className="grid gap-5">
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
              </div>
            )}

            {loadMoreError && (
              <p className="text-sm text-destructive">{loadMoreError}</p>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function FiltersSidebar({
  data,
  onChange,
  flightNumberValue,
  onFlightNumberChange,
  takeoffRange,
  onTakeoffRangeChange,
  landingRange,
  onLandingRangeChange,
}: {
  data: FareOptionsPageData
  onChange: (
    patch: Partial<Omit<FareOptionsPageData["state"], "selected">> & {
      selected?: string[]
    }
  ) => void
  flightNumberValue: string
  onFlightNumberChange: (value: string) => void
  takeoffRange: [number, number]
  onTakeoffRangeChange: (value: [number, number]) => void
  landingRange: [number, number]
  onLandingRangeChange: (value: [number, number]) => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <Card className="rounded-2xl bg-card/70 shadow-none">
        <CardHeader className="gap-3 px-6 pt-6 pb-4">
          <CardTitle className="text-lg">{data.searchSummary.title}</CardTitle>
          <p className="text-sm md:text-base">
            {data.searchSummary.routeLabel}
          </p>
          <p className="text-sm text-muted-foreground md:text-base">
            {data.searchSummary.dateRangeLabel}
          </p>
          <p className="text-sm text-muted-foreground md:text-base">
            {data.searchSummary.cabinLabel}
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <Button
            variant="outline"
            className="w-full rounded-xl"
            render={<Link href="/" />}
          >
            Edit search
          </Button>
        </CardContent>
      </Card>

      <FieldGroup className="gap-8">
        <Field>
          <FieldLabel className="text-base font-semibold">Sort by</FieldLabel>
          <RadioGroup
            value={data.state.sort}
            onValueChange={(nextValue) =>
              onChange({
                sort: nextValue as FareOptionsPageData["state"]["sort"],
              })
            }
            className="gap-4"
          >
            {SORT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 text-sm"
              >
                <RadioGroupItem value={option.value} />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </Field>

        <Field>
          <FieldLabel className="text-base font-semibold">Stops</FieldLabel>
          <RadioGroup
            value={data.state.stops}
            onValueChange={(nextValue) =>
              onChange({
                stops: nextValue as FareOptionsPageData["state"]["stops"],
              })
            }
            className="gap-4"
          >
            {STOPS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 text-sm"
              >
                <RadioGroupItem value={option.value} />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </Field>

        <Field>
          <FieldLabel className="text-base font-semibold">Airlines</FieldLabel>
          <Select
            value={data.state.airline}
            onValueChange={(nextValue) =>
              onChange({
                airline:
                  !nextValue || nextValue === "all" ? undefined : nextValue,
              })
            }
          >
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue placeholder="All airlines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All airlines</SelectItem>
              {data.airlines.map((airline) => (
                <SelectItem key={airline} value={airline}>
                  {airline}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel className="text-base font-semibold">
            Flight number
          </FieldLabel>
          <Input
            value={flightNumberValue}
            onChange={(event) => onFlightNumberChange(event.target.value)}
            className="h-12 rounded-xl text-sm"
            placeholder="e.g. AI0278"
          />
        </Field>

        <FieldGroup className="gap-6">
          <Field>
            <FieldLabel className="text-base font-semibold">
              <PlaneTakeoffIcon data-icon="inline-start" />
              Take-off
            </FieldLabel>
            <Slider
              min={0}
              max={1439}
              step={15}
              value={takeoffRange}
              onValueChange={(nextValue) => {
                onTakeoffRangeChange(toSliderRange(nextValue))
              }}
            />
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>{formatMinutes(takeoffRange[0])}</span>
              <span>{formatMinutes(takeoffRange[1])}</span>
            </div>
          </Field>

          <Field>
            <FieldLabel className="text-base font-semibold">
              <PlaneLandingIcon data-icon="inline-start" />
              Landing
            </FieldLabel>
            <Slider
              min={0}
              max={1439}
              step={15}
              value={landingRange}
              onValueChange={(nextValue) => {
                onLandingRangeChange(toSliderRange(nextValue))
              }}
            />
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>{formatMinutes(landingRange[0])}</span>
              <span>{formatMinutes(landingRange[1])}</span>
            </div>
          </Field>
        </FieldGroup>
      </FieldGroup>
    </div>
  )
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function toSliderRange(value: number | readonly number[]): [number, number] {
  if (!Array.isArray(value)) {
    return [0, 1439]
  }

  return [value[0] ?? 0, value[1] ?? 1439]
}

function sameRange(
  left: readonly [number, number],
  right: readonly [number, number]
) {
  return left[0] === right[0] && left[1] === right[1]
}

function isResultsStateEqual(
  left: FareOptionsPageData["state"],
  right: FareOptionsPageData["state"]
) {
  return (
    left.leg === right.leg &&
    left.sort === right.sort &&
    left.stops === right.stops &&
    left.airline === right.airline &&
    left.flightNumber === right.flightNumber &&
    left.takeoffFrom === right.takeoffFrom &&
    left.takeoffTo === right.takeoffTo &&
    left.landingFrom === right.landingFrom &&
    left.landingTo === right.landingTo &&
    left.after === right.after &&
    left.selected.length === right.selected.length &&
    left.selected.every((value, index) => value === right.selected[index])
  )
}
