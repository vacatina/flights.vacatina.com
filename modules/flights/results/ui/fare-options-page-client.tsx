"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FilterIcon, PlaneLandingIcon, PlaneTakeoffIcon } from "lucide-react"

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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  applyOfferClientSorting,
  toResultsUrlSearchParams,
  type FareOptionsPageData,
} from "@/modules/flights/results/domain"
import { loadMoreFareOptionsAction } from "@/modules/flights/results/server/actions"

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

export function FareOptionsPageClient({ data }: { data: FareOptionsPageData }) {
  const router = useRouter()
  const [offers, setOffers] = useState(data.offers)
  const [nextAfter, setNextAfter] = useState<string | null>(data.after)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [isFilterDialogOpen, setFilterDialogOpen] = useState(false)
  const [isLoadingMore, startLoadingMore] = useTransition()

  function updateQuery(
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
    const search = toResultsUrlSearchParams(nextState).toString()
    router.replace(`/results/${data.partialOfferRequestId}/fare-options?${search}`)
  }

  function selectOffer(offerId: string) {
    const nextSelected = [...data.selected, offerId]

    if (data.leg < data.totalLegs - 1) {
      const nextState = {
        ...data.state,
        leg: data.leg + 1,
        selected: nextSelected,
        after: undefined,
      }
      const search = toResultsUrlSearchParams(nextState).toString()
      router.push(`/results/${data.partialOfferRequestId}/fare-options?${search}`)
      return
    }

    const params = new URLSearchParams()
    params.set("selected", nextSelected.join(","))
    router.push(`/results/${data.partialOfferRequestId}/review?${params.toString()}`)
  }

  function loadMore() {
    if (!nextAfter) {
      return
    }

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
          setLoadMoreError(result.error.message)
          return
        }

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
    <main className="min-h-svh bg-muted/40 py-5 md:py-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 md:px-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Orders</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>New order</BreadcrumbLink>
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
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="hidden lg:block">
            <FiltersSidebar
              data={data}
              onChange={updateQuery}
            />
          </aside>

          <section className="flex flex-col gap-4">
            {offers.length === 0 && (
              <Card className="rounded-2xl">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No fares match these filters.
                </CardContent>
              </Card>
            )}

            {offers.length > 0 && (
              <Accordion multiple className="gap-4">
                {offers.map((offer) => (
                  <Card key={offer.id} className="overflow-hidden rounded-2xl border shadow-none">
                    <AccordionItem value={offer.id} className="border-b-0">
                      <CardHeader className="p-0">
                        <AccordionTrigger className="w-full px-4 py-4 no-underline hover:no-underline md:px-8 md:py-6">
                          <div className="grid w-full gap-6 text-left md:grid-cols-[1.3fr_1fr_1fr]">
                            <div className="flex items-center gap-4">
                              <div className="flex size-12 items-center justify-center rounded-md bg-primary/10 font-semibold text-primary">
                                {offer.ownerCode}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[1.7rem] leading-tight font-semibold md:text-2xl">
                                  {offer.departureTimeLabel} - {offer.arrivalTimeLabel}
                                  {offer.arrivalDayOffset > 0 && `+${offer.arrivalDayOffset}`}
                                </span>
                                <span className="text-xl text-muted-foreground md:text-base">
                                  {offer.ownerName} · {offer.flightNumbersLabel}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[1.7rem] leading-tight font-semibold md:text-2xl">
                                {offer.durationLabel}
                              </span>
                              <span className="text-xl text-muted-foreground md:text-base">
                                {offer.routeLabel}
                              </span>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[1.7rem] leading-tight font-semibold md:text-2xl">
                                {offer.stopsLabel}
                              </span>
                              <span className="text-xl text-muted-foreground md:text-base">
                                {offer.stopsDetails ?? "Direct flight"}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                      </CardHeader>

                      <AccordionContent className="px-4 md:px-8">
                        <div className="relative flex flex-col gap-2 pb-2 pl-10">
                          <div className="absolute top-3 bottom-3 left-4 border-l border-dashed border-border" />
                          {offer.timeline.map((event, eventIndex) => {
                            const isArrival = eventIndex % 2 === 1
                            const layover = isArrival
                              ? offer.layovers[Math.floor(eventIndex / 2)]
                              : null

                            return (
                              <div key={event.id} className="relative py-2">
                                <span className="absolute -left-7 top-3 size-4 rounded-full border bg-background" />
                                <div className="flex flex-col gap-1">
                                  <div className="grid gap-2 md:grid-cols-[260px_1fr]">
                                    <strong className="text-[1.7rem] leading-tight md:text-[2rem]">
                                      {event.dateTimeLabel}
                                    </strong>
                                    <span className="text-[1.7rem] text-foreground md:text-2xl">
                                      {event.description}
                                    </span>
                                  </div>
                                  {event.segmentDurationLabel && (
                                    <p className="text-xl text-muted-foreground md:text-base">
                                      Flight duration: {event.segmentDurationLabel}
                                    </p>
                                  )}
                                  {event.meta.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                      {event.meta.map((metaItem) => (
                                        <Badge key={metaItem} variant="secondary">
                                          {metaItem}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  {layover && (
                                    <Badge variant="outline" className="mt-2 w-fit">
                                      {layover.label}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <Separator />

                    <CardFooter className="flex items-center justify-between px-4 py-4 md:px-8">
                      <p className="text-xl text-muted-foreground md:text-base">
                        From{" "}
                        <span className="text-[2.2rem] font-semibold text-foreground md:text-5xl">
                          {offer.totalAmountLabel}
                        </span>
                      </p>
                      <Button
                        className="rounded-xl px-7 text-[1.8rem] md:text-base"
                        onClick={() => selectOffer(offer.id)}
                      >
                        Select
                      </Button>
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
              <div className="grid gap-4">
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
              </div>
            )}

            {loadMoreError && <p className="text-sm text-destructive">{loadMoreError}</p>}
          </section>
        </div>
      </div>
    </main>
  )
}

function FiltersSidebar({
  data,
  onChange,
}: {
  data: FareOptionsPageData
  onChange: (
    patch: Partial<Omit<FareOptionsPageData["state"], "selected">> & {
      selected?: string[]
    }
  ) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl bg-card/70 shadow-none">
        <CardHeader className="gap-2 px-5 pt-5 pb-3">
          <CardTitle className="text-4xl md:text-2xl">{data.searchSummary.title}</CardTitle>
          <p className="text-[1.7rem] md:text-lg">{data.searchSummary.routeLabel}</p>
          <p className="text-xl text-muted-foreground md:text-base">
            {data.searchSummary.dateRangeLabel}
          </p>
          <p className="text-xl text-muted-foreground md:text-base">
            {data.searchSummary.cabinLabel}
          </p>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Button
            variant="outline"
            className="w-full rounded-xl"
            render={<Link href="/" />}
          >
            Edit search
          </Button>
        </CardContent>
      </Card>

      <FieldGroup className="gap-6">
        <Field>
          <FieldLabel className="text-[1.8rem] font-semibold md:text-2xl">Sort by</FieldLabel>
          <RadioGroup
            value={data.state.sort}
            onValueChange={(nextValue) =>
              onChange({ sort: nextValue as FareOptionsPageData["state"]["sort"] })
            }
            className="gap-3"
          >
            {SORT_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-3 text-[1.7rem] md:text-lg">
                <RadioGroupItem value={option.value} />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </Field>

        <Field>
          <FieldLabel className="text-[1.8rem] font-semibold md:text-2xl">Stops</FieldLabel>
          <RadioGroup
            value={data.state.stops}
            onValueChange={(nextValue) =>
              onChange({ stops: nextValue as FareOptionsPageData["state"]["stops"] })
            }
            className="gap-3"
          >
            {STOPS_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-3 text-[1.7rem] md:text-lg">
                <RadioGroupItem value={option.value} />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </Field>

        <Field>
          <FieldLabel className="text-[1.8rem] font-semibold md:text-2xl">Airlines</FieldLabel>
          <Select
            value={data.state.airline ?? "__all__"}
            onValueChange={(nextValue) =>
              onChange({
                airline:
                  !nextValue || nextValue === "__all__" ? undefined : nextValue,
              })
            }
          >
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All airlines</SelectItem>
              {data.airlines.map((airline) => (
                <SelectItem key={airline} value={airline}>
                  {airline}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel className="text-[1.8rem] font-semibold md:text-2xl">Flight number</FieldLabel>
          <Input
            value={data.state.flightNumber ?? ""}
            onChange={(event) =>
              onChange({ flightNumber: event.target.value || undefined })
            }
            className="h-12 rounded-xl text-[1.7rem] md:text-base"
            placeholder="e.g. AI0278"
          />
        </Field>

        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel className="text-[1.8rem] font-semibold md:text-2xl">
              <PlaneTakeoffIcon data-icon="inline-start" />
              Take-off
            </FieldLabel>
            <Slider
              min={0}
              max={1439}
              step={15}
              value={[data.state.takeoffFrom, data.state.takeoffTo]}
              onValueChange={(nextValue) => {
                const [from, to] = toSliderRange(nextValue)
                onChange({
                  takeoffFrom: from,
                  takeoffTo: to,
                })
              }}
            />
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>{formatMinutes(data.state.takeoffFrom)}</span>
              <span>{formatMinutes(data.state.takeoffTo)}</span>
            </div>
          </Field>

          <Field>
            <FieldLabel className="text-[1.8rem] font-semibold md:text-2xl">
              <PlaneLandingIcon data-icon="inline-start" />
              Landing
            </FieldLabel>
            <Slider
              min={0}
              max={1439}
              step={15}
              value={[data.state.landingFrom, data.state.landingTo]}
              onValueChange={(nextValue) => {
                const [from, to] = toSliderRange(nextValue)
                onChange({
                  landingFrom: from,
                  landingTo: to,
                })
              }}
            />
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>{formatMinutes(data.state.landingFrom)}</span>
              <span>{formatMinutes(data.state.landingTo)}</span>
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
