import type { ReactNode } from "react"
import { BriefcaseIcon } from "lucide-react"

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Money } from "@/modules/currency/ui"
import type { OfferCardViewModel } from "@/modules/flights/results/domain"
import { FlightResultSummary } from "@/modules/flights/results/ui/flight-result-summary"

interface FlightOfferCardProps {
  offer: OfferCardViewModel
  action: ReactNode
}

/** The canonical flight result card, shared by search results and homepage offers. */
export function FlightOfferCard({ offer, action }: FlightOfferCardProps) {
  return (
    <Card className="group/card overflow-hidden rounded-2xl border bg-card/95 shadow-none duration-200 hover:shadow-md">
      <AccordionItem value={offer.id} className="border-none">
        <CardHeader className="p-0">
          <AccordionTrigger className="w-full px-6 py-5 no-underline hover:no-underline md:px-8 md:py-5">
            <FlightResultSummary
              carrierName={offer.ownerName}
              carrierCode={offer.ownerCode}
              carrierLogoUrl={offer.ownerLogoSymbolUrl}
              flightNumbersLabel={offer.flightNumbersLabel}
              departureTimeLabel={offer.departureTimeLabel}
              arrivalTimeLabel={offer.arrivalTimeLabel}
              arrivalDayOffset={offer.arrivalDayOffset}
              durationLabel={offer.durationLabel}
              routeLabel={offer.routeLabel}
              stopsLabel={offer.stopsLabel}
              stopsDetails={offer.stopsDetails}
            />
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
                          Flight duration: {departureEvent.segmentDurationLabel}
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
            <Money
              money={offer.totalMoney}
              fallbackLabel={offer.totalAmountLabel}
            />
          </span>
        </p>
        {action}
      </CardFooter>
    </Card>
  )
}
