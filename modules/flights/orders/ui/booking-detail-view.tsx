import Image from "next/image"
import Link from "next/link"
import {
  BaggageClaimIcon,
  BriefcaseIcon,
  ChevronDownIcon,
  CopyIcon,
  FileDownIcon,
  PlaneTakeoffIcon,
  TicketIcon,
  TriangleAlertIcon,
  UserIcon,
} from "lucide-react"

import type {
  BookingDetailModel,
  FlightOrderSnapshotLeg,
  FlightOrderSnapshotTimelineEvent,
} from "@/modules/flights/orders/domain"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface BookingDetailViewProps {
  detail: BookingDetailModel
  refreshHref?: string
}

interface DisplayTimelineEvent {
  id: string
  dateTimeLabel: string
  description: string
  segmentDurationLabel?: string
  meta: string[]
}

interface DisplayLeg {
  leg: FlightOrderSnapshotLeg
  departureTimeLabel: string
  arrivalTimeLabel: string
  subtitle: string
  stopsDetails: string
  timeline: DisplayTimelineEvent[]
}

export function BookingDetailView({
  detail,
  refreshHref,
}: BookingDetailViewProps) {
  const firstLeg = detail.snapshot.legs[0] ?? null
  const passengers = getPassengersForDisplay(detail)
  const legs = detail.snapshot.legs.map((leg) =>
    normalizeLegForDisplay(leg, detail.snapshot.cabinClassLabel)
  )
  const airlineName = firstLeg?.ownerName ?? "Airline unavailable"
  const airlineLogo = firstLeg?.ownerLogoSymbolUrl ?? null
  const ticketDocuments = detail.snapshot.ticketDocuments
  const bookedServices = detail.snapshot.bookedServices
  const availableActions = detail.snapshot.availableActions
  const metadataEntries = detail.snapshot.metadataEntries
  const notifications =
    detail.notifications.length > 0
      ? detail.notifications
      : [
          {
            id: "fallback-created",
            eventType: "booking_confirmed" as const,
            status: "sent" as const,
            createdAtLabel: detail.createdAtLabel,
            sentAtLabel: null,
            lastError: null,
          },
        ]

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px] xl:gap-9">
      <section className="space-y-10">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {detail.bookingReference}
            </h1>
            <button
              type="button"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Copy booking reference"
            >
              <CopyIcon className="size-6" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-5 text-base"
            >
              <TicketIcon className="mr-2 size-4" />
              Ticket numbers
              {ticketDocuments.length > 0 ? ` (${ticketDocuments.length})` : ""}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-5 text-base"
            >
              <FileDownIcon className="mr-2 size-4" />
              Export itinerary
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 px-5 text-base"
            >
              Manage this order
              <ChevronDownIcon className="ml-2 size-4" />
            </Button>
          </div>
        </header>

        <section className="space-y-7">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Journey details
          </h2>

          {legs.length === 0 ? (
            <p className="text-base text-muted-foreground">
              Journey details are unavailable for this booking.
            </p>
          ) : null}

          <div className="space-y-8">
            {legs.map((displayLeg, legIndex) => (
              <article
                key={`${displayLeg.leg.legIndex}-${displayLeg.leg.departureAtIso ?? legIndex}`}
                className="space-y-6"
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_170px_170px]">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex size-16 shrink-0 items-center justify-center rounded-md">
                      {displayLeg.leg.ownerLogoSymbolUrl ? (
                        <Image
                          src={displayLeg.leg.ownerLogoSymbolUrl}
                          alt={`${displayLeg.leg.ownerName} logo`}
                          width={50}
                          height={50}
                          unoptimized
                        />
                      ) : (
                        <PlaneTakeoffIcon className="size-6 text-muted-foreground" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                        {displayLeg.departureTimeLabel} -{" "}
                        {displayLeg.arrivalTimeLabel}
                      </p>
                      <p className="text-base text-muted-foreground">
                        {displayLeg.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                      {displayLeg.leg.durationLabel}
                    </p>
                    <p className="text-base text-muted-foreground">
                      {displayLeg.stopsDetails}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                      {displayLeg.leg.stopsLabel}
                    </p>
                    <p className="text-base text-muted-foreground">
                      {displayLeg.leg.stopsLabel === "Non-stop"
                        ? "Direct flight"
                        : (displayLeg.leg.layovers[0]?.label ??
                          "Connecting flight")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {displayLeg.timeline.map((event, eventIndex) => {
                    const layover =
                      event.id.includes("-arrive") &&
                      displayLeg.leg.layovers.length > 0 &&
                      Math.floor(eventIndex / 2) <
                        displayLeg.leg.layovers.length
                        ? (displayLeg.leg.layovers[
                            Math.floor(eventIndex / 2)
                          ] ?? null)
                        : null

                    return (
                      <div
                        key={event.id}
                        className="grid grid-cols-[34px_minmax(0,1fr)] gap-5"
                      >
                        <div className="relative flex justify-center">
                          <span className="mt-1 size-5 rounded-full border border-border bg-background" />
                          {eventIndex < displayLeg.timeline.length - 1 ? (
                            <span className="absolute top-7 bottom-[-14px] border-l border-dashed border-border" />
                          ) : null}
                        </div>

                        <div className="space-y-2 pb-2">
                          <div className="grid gap-2 lg:grid-cols-[360px_1fr]">
                            <p className="text-base font-semibold tracking-tight text-foreground md:text-lg">
                              {event.dateTimeLabel}
                            </p>
                            <p className="text-base tracking-tight text-foreground md:text-lg">
                              {event.description}
                            </p>
                          </div>

                          {event.segmentDurationLabel ? (
                            <p className="text-base text-foreground">
                              Flight duration: {event.segmentDurationLabel}
                            </p>
                          ) : null}

                          {event.meta.length > 0 ? (
                            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                              {event.meta.map((metaItem) => (
                                <span key={`${event.id}-${metaItem}`}>
                                  {metaItem}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {layover ? (
                            <p className="inline-flex rounded-full bg-muted px-4 py-1 text-sm text-foreground">
                              {layover.label}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {legIndex < legs.length - 1 ? <Separator /> : null}
              </article>
            ))}
          </div>
        </section>

        {bookedServices.length > 0 ? (
          <>
            <Separator />
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Booked extras
              </h2>
              <div className="space-y-2">
                {bookedServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-base"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {toServiceTypeLabel(service.type)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {service.passengerIds.length} passenger
                        {service.passengerIds.length === 1 ? "" : "s"} ·{" "}
                        {service.segmentIds.length} segment
                        {service.segmentIds.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="font-semibold text-foreground">
                      {service.totalAmountLabel}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        <Separator />

        <section className="space-y-7">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Passengers
          </h2>

          <div className="space-y-8">
            {passengers.map((passenger) => (
              <article key={passenger.id} className="space-y-6">
                <Badge
                  variant="secondary"
                  className="rounded-md px-3 py-1 text-xs font-normal"
                >
                  <UserIcon className="mr-2 size-4" />
                  {passenger.label}
                </Badge>

                <div className="grid gap-x-8 gap-y-5 lg:grid-cols-3">
                  <PassengerInfoItem
                    label="Name"
                    value={passenger.fullName ?? "Not provided"}
                  />
                  <PassengerInfoItem
                    label="Date of birth"
                    value={passenger.dateOfBirthLabel ?? "Not provided"}
                  />
                  <PassengerInfoItem
                    label="Gender"
                    value={passenger.genderLabel ?? "Not provided"}
                  />
                  <PassengerInfoItem
                    label="E-mail"
                    value={passenger.email ?? detail.contactEmail}
                  />
                  <PassengerInfoItem
                    label="Contact number"
                    value={passenger.phoneNumber ?? "Not provided"}
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg text-muted-foreground">
                    Flight information
                  </h3>

                  {legs.map((displayLeg) => {
                    const arrivalMeta =
                      displayLeg.timeline.findLast((event) =>
                        event.id.includes("-arrive")
                      )?.meta ?? []
                    const carryOn =
                      arrivalMeta.find((item) => item.includes("carry-on")) ??
                      "Carry-on unavailable"
                    const checked =
                      arrivalMeta.find((item) => item.includes("checked")) ??
                      "Checked baggage unavailable"

                    return (
                      <div
                        key={`${passenger.id}-${displayLeg.leg.legIndex}`}
                        className="rounded-lg border border-border px-6 py-5"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="flex size-11 items-center justify-center rounded-md">
                              {displayLeg.leg.ownerLogoSymbolUrl ? (
                                <Image
                                  src={displayLeg.leg.ownerLogoSymbolUrl}
                                  alt={`${displayLeg.leg.ownerName} logo`}
                                  width={36}
                                  height={36}
                                  unoptimized
                                />
                              ) : (
                                <PlaneTakeoffIcon className="size-5 text-muted-foreground" />
                              )}
                            </div>

                            <p className="text-base font-semibold tracking-tight text-foreground md:text-lg">
                              {displayLeg.leg.departureIata} to{" "}
                              {displayLeg.leg.arrivalIata} on{" "}
                              {displayLeg.leg.departureLabel}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-x-8 gap-y-2 text-base text-foreground">
                            <span className="inline-flex items-center gap-2">
                              <BriefcaseIcon className="size-5" />
                              {carryOn}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <BaggageClaimIcon className="size-5" />
                              {checked}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-5 pb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Billing summary
          </h2>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_200px] bg-muted/30 px-6 py-4 text-base text-foreground">
              <p>Description</p>
              <p className="text-right">Price ({detail.snapshot.currency})</p>
            </div>

            <div className="space-y-1 px-6 py-4 text-base">
              <BillingRow
                label="Fare"
                value={
                  detail.snapshot.billingSummary.fareAmountLabel ??
                  detail.snapshot.sellAmountLabel
                }
                highlighted
              />
              <BillingRow
                label="Fare taxes"
                value={
                  detail.snapshot.billingSummary.taxesAmountLabel ?? "Included"
                }
              />
              <div className="h-px bg-border" />
              <BillingRow
                label={`Total (${detail.snapshot.currency})`}
                value={detail.snapshot.billingSummary.totalAmountLabel}
                highlighted
              />
            </div>
          </div>
        </section>
      </section>

      <aside className="border-l border-border pl-8">
        <div className="sticky top-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Summary
            </h2>
            <p className="text-sm text-muted-foreground">
              Order ID:{" "}
              <span className="font-medium text-foreground">
                {detail.duffelOrderId}
              </span>
            </p>
            {detail.snapshot.airlineBookingReference ? (
              <p className="text-sm text-muted-foreground">
                Airline PNR:{" "}
                <span className="font-medium text-foreground">
                  {detail.snapshot.airlineBookingReference}
                </span>
              </p>
            ) : null}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-3 py-1 text-sm",
                  detail.statusLabel.toLowerCase().includes("confirm")
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border bg-muted text-foreground"
                )}
              >
                {detail.statusLabel}
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Airline</p>
              <div className="flex items-center gap-2 text-base text-foreground">
                {airlineLogo ? (
                  <Image
                    src={airlineLogo}
                    alt={`${airlineName} logo`}
                    width={24}
                    height={24}
                    unoptimized
                  />
                ) : (
                  <PlaneTakeoffIcon className="size-4 text-muted-foreground" />
                )}
                <span className="line-clamp-1">{airlineName}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Fare conditions
            </p>
            <p className="text-base text-muted-foreground">
              {detail.snapshot.conditions.changes}
            </p>
            <p className="text-base text-muted-foreground">
              {detail.snapshot.conditions.refunds}
            </p>
          </div>

          <div className="space-y-3">
            {notifications.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="flex size-8 items-center justify-center rounded bg-muted text-sm font-semibold text-foreground">
                  V
                </div>
                <div className="space-y-1">
                  <p className="text-base text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Vacatina
                    </span>{" "}
                    {toNotificationEventLabel(item.eventType)}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.createdAtLabel}
                  </p>
                  {item.status === "failed" && item.lastError ? (
                    <p className="text-xs text-destructive">{item.lastError}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Payment mode:{" "}
              {detail.paymentMode === "pay_now" ? "Pay now" : "Hold order"}
            </p>
            {detail.checkoutSessionStatus ? (
              <p>Checkout status: {detail.checkoutSessionStatus}</p>
            ) : null}
            {detail.paymentProvider ? (
              <p>Provider: {detail.paymentProvider}</p>
            ) : null}
            {detail.providerOrderId ? (
              <p>Provider order ID: {detail.providerOrderId}</p>
            ) : null}
            {detail.providerPaymentId ? (
              <p>Provider payment ID: {detail.providerPaymentId}</p>
            ) : null}
            {detail.providerStatusCode ? (
              <p>Provider status code: {detail.providerStatusCode}</p>
            ) : null}
            {detail.providerStatusMessage ? (
              <p>Provider status message: {detail.providerStatusMessage}</p>
            ) : null}
            {detail.paymentAmountLabel ? (
              <p>Charged amount: {detail.paymentAmountLabel}</p>
            ) : null}
            {detail.paymentCurrency ? (
              <p>Charge currency: {detail.paymentCurrency}</p>
            ) : null}
            {detail.fxSourceCurrency &&
            detail.fxTargetCurrency &&
            detail.fxEffectiveRate ? (
              <p>
                FX: {detail.fxSourceCurrency} → {detail.fxTargetCurrency} @{" "}
                {detail.fxEffectiveRate.toFixed(6)}
              </p>
            ) : null}
            {detail.paidAtLabel ? <p>Paid at: {detail.paidAtLabel}</p> : null}
            {detail.paymentRequiredByLabel ? (
              <p>Payment required by: {detail.paymentRequiredByLabel}</p>
            ) : null}
            {detail.priceGuaranteeExpiresAtLabel ? (
              <p>
                Price guaranteed until: {detail.priceGuaranteeExpiresAtLabel}
              </p>
            ) : null}
            {detail.checkoutErrorMessage ? (
              <p className="text-destructive">{detail.checkoutErrorMessage}</p>
            ) : null}
          </div>

          {availableActions.length > 0 ? (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Available actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableActions.map((action) => (
                    <Badge
                      key={action}
                      variant="secondary"
                      className="font-normal"
                    >
                      {toActionLabel(action)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {metadataEntries.length > 0 ? (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Metadata</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {metadataEntries.slice(0, 6).map((entry) => (
                    <p key={`${entry.key}-${entry.value}`}>
                      {entry.key}: {entry.value}
                    </p>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {ticketDocuments.length > 0 ? (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Ticket numbers
                </p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {ticketDocuments.slice(0, 6).map((document) => (
                    <p key={`${document.type}-${document.uniqueIdentifier}`}>
                      {document.uniqueIdentifier}
                    </p>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {refreshHref ? (
            <Button
              className="w-full"
              variant="outline"
              render={<Link href={refreshHref} />}
            >
              Refresh status
            </Button>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

function PassengerInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-base text-foreground">{value}</p>
    </div>
  )
}

function BillingRow({
  label,
  value,
  highlighted = false,
}: {
  label: string
  value: string
  highlighted?: boolean
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_200px] items-center gap-3 py-1">
      <p
        className={cn(
          "text-muted-foreground",
          highlighted && "text-foreground"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "text-right font-medium text-foreground",
          highlighted && "font-semibold"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function getPassengersForDisplay(detail: BookingDetailModel) {
  if (detail.snapshot.passengers.length > 0) {
    return detail.snapshot.passengers
  }

  return Array.from(
    { length: Math.max(1, detail.snapshot.passengerCount) },
    (_, index) => ({
      id: `fallback-passenger-${index + 1}`,
      label: `Passenger ${index + 1}`,
      typeLabel: "Passenger",
      fullName: "Not provided",
      dateOfBirthLabel: "Not provided",
      genderLabel: "Not provided",
      email: detail.contactEmail,
      phoneNumber: null,
    })
  )
}

function normalizeLegForDisplay(
  leg: FlightOrderSnapshotLeg,
  fallbackCabinClassLabel: string
): DisplayLeg {
  const normalizedTimeline = normalizeTimelineEvents(leg.timeline)
  const timeline =
    normalizedTimeline.length > 0
      ? normalizedTimeline
      : buildFallbackTimeline(leg, fallbackCabinClassLabel)
  const departureTimeLabel = resolveTimeLabel(leg.departureTimeLabel, [
    extractTime(leg.departureLabel),
    extractTime(leg.departureAtIso),
    extractTimeFromTimeline(timeline, "depart"),
  ])
  const arrivalTimeLabel = resolveTimeLabel(leg.arrivalTimeLabel, [
    extractTime(leg.arrivalLabel),
    extractTime(leg.arrivalAtIso),
    extractTimeFromTimeline(timeline, "arrive"),
  ])
  const subtitle =
    leg.subtitle.trim().length > 0
      ? leg.subtitle
      : `${fallbackCabinClassLabel} · ${leg.ownerName}`
  const stopsDetails =
    leg.stopsDetails.trim().length > 0 ? leg.stopsDetails : leg.routeLabel

  return {
    leg,
    departureTimeLabel,
    arrivalTimeLabel,
    subtitle,
    stopsDetails,
    timeline,
  }
}

function buildFallbackTimeline(
  leg: FlightOrderSnapshotLeg,
  fallbackCabinClassLabel: string
): DisplayTimelineEvent[] {
  return [
    {
      id: `${leg.legIndex}-fallback-depart`,
      dateTimeLabel: leg.departureLabel,
      description: `Depart from ${leg.departureIata}`,
      segmentDurationLabel: leg.durationLabel,
      meta: [],
    },
    {
      id: `${leg.legIndex}-fallback-arrive`,
      dateTimeLabel: leg.arrivalLabel,
      description: `Arrive at ${leg.arrivalIata}`,
      meta: [fallbackCabinClassLabel, leg.ownerName].filter(Boolean),
    },
  ]
}

function normalizeTimelineEvents(
  events: FlightOrderSnapshotTimelineEvent[]
): DisplayTimelineEvent[] {
  if (!Array.isArray(events)) {
    return []
  }

  return events
    .filter((event) => Boolean(event && typeof event === "object"))
    .map((event, index) => ({
      id:
        typeof event.id === "string" && event.id.trim().length > 0
          ? event.id
          : `timeline-event-${index}`,
      dateTimeLabel:
        typeof event.dateTimeLabel === "string" &&
        event.dateTimeLabel.trim().length > 0
          ? event.dateTimeLabel
          : "Date unavailable",
      description:
        typeof event.description === "string" &&
        event.description.trim().length > 0
          ? event.description
          : "Flight detail unavailable",
      segmentDurationLabel:
        typeof event.segmentDurationLabel === "string" &&
        event.segmentDurationLabel.trim().length > 0
          ? event.segmentDurationLabel
          : undefined,
      meta: Array.isArray(event.meta)
        ? event.meta.filter(
            (item): item is string =>
              typeof item === "string" && item.trim().length > 0
          )
        : [],
    }))
}

function resolveTimeLabel(
  primary: string | null | undefined,
  fallbacks: Array<string | null>
) {
  if (!isUnknownTime(primary)) {
    return primary ?? "--:--"
  }

  for (const fallback of fallbacks) {
    if (fallback && !isUnknownTime(fallback)) {
      return fallback
    }
  }

  return "--:--"
}

function isUnknownTime(value: string | null | undefined) {
  if (!value) {
    return true
  }

  return value.includes("--")
}

function extractTime(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const matched = value.match(/\b(\d{2}:\d{2})\b/)
  return matched?.[1] ?? null
}

function extractTimeFromTimeline(
  timeline: DisplayTimelineEvent[],
  mode: "depart" | "arrive"
) {
  const event = timeline.find((item) =>
    mode === "depart" ? item.id.includes("depart") : item.id.includes("arrive")
  )

  return extractTime(event?.dateTimeLabel)
}

function toNotificationEventLabel(
  eventType: BookingDetailModel["notifications"][number]["eventType"]
) {
  switch (eventType) {
    case "hold_created":
      return "placed this booking on hold"
    case "reconciliation_required":
      return "flagged this booking for payment reconciliation"
    case "booking_confirmed":
    default:
      return "created this order"
  }
}

function toServiceTypeLabel(value: string) {
  const normalized = value.trim().toLowerCase()
  switch (normalized) {
    case "baggage":
      return "Extra baggage"
    case "seat":
      return "Seat selection"
    default:
      return value
        .split("_")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ")
  }
}

function toActionLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}
