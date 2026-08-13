import {
  AlertCircleIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  Clock3Icon,
  DoorOpenIcon,
  FileCheck2Icon,
  FileQuestionIcon,
  InfoIcon,
  LandmarkIcon,
  MoveRightIcon,
  NotebookTabsIcon,
  PlaneTakeoffIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WalletCardsIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  getVisaCountry,
  type VisaAssistanceResult,
  type VisaDocumentResult,
  type VisaProductOption,
  type VisaResponseMetadata,
} from "@/modules/visa-assistance/domain"
import { VisaSearchForm } from "@/modules/visa-assistance/ui/visa-search-form"

interface VisaDetailsProps {
  result: VisaAssistanceResult
}

const outcomeContent = {
  visa_supported: {
    label: "Visa required",
    title: "You’ll need a visa for this trip",
    description: "We found a visa option for this passport and destination.",
    icon: FileCheck2Icon,
  },
  document_not_required: {
    label: "Visa not required",
    title: "You can travel without a visa",
    description:
      "No additional visa requirement was found for this passport and destination.",
    icon: CheckCircle2Icon,
  },
  document_unsupported: {
    label: "Visa may be required",
    title: "You may need to arrange your visa separately",
    description:
      "A travel document appears to be required, but an online visa option is not currently available here.",
    icon: AlertCircleIcon,
  },
  other_document_supported: {
    label: "Travel document needed",
    title: "You may need another travel document",
    description:
      "Review the document option below before you make your travel plans.",
    icon: FileQuestionIcon,
  },
} as const

export function VisaDetails({ result }: VisaDetailsProps) {
  const nationality = getVisaCountry(result.nationality)
  const destination = getVisaCountry(result.destination)
  const outcome =
    outcomeContent[
      result.requirements.outcome as keyof typeof outcomeContent
    ] ?? outcomeContent.document_unsupported
  const OutcomeIcon = outcome.icon
  const latestMetadata = getLatestMetadata(result)

  return (
    <main className="bg-muted/40">
      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        <div
          className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:30px_30px] opacity-15"
          aria-hidden="true"
        />
        <div
          className="absolute -top-32 right-[-8rem] size-[28rem] rounded-full border border-primary-foreground/15"
          aria-hidden="true"
        />

        <div className="relative mx-auto w-full max-w-7xl px-5 py-12 md:px-8 md:py-16 lg:px-12">
          <div className="flex flex-wrap items-center gap-3 text-sm text-primary-foreground/75">
            <span className="inline-flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">
                {nationality?.emoji}
              </span>
              {nationality?.name ?? result.nationality} passport
            </span>
            <ArrowRightIcon className="size-4" />
            <span className="inline-flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">
                {destination?.emoji}
              </span>
              {destination?.name ?? result.destination}
            </span>
          </div>

          <div className="mt-8 grid max-w-5xl gap-6 md:grid-cols-[auto_1fr] md:items-start">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-primary-foreground text-primary shadow-lg">
              <OutcomeIcon className="size-7" />
            </span>
            <div>
              <Badge variant="secondary" className="mb-4">
                {outcome.label}
              </Badge>
              <h1 className="font-heading text-4xl leading-tight font-semibold tracking-[-0.035em] text-balance md:text-5xl">
                {outcome.title}
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-pretty text-primary-foreground/80">
                {result.requirements.requirement_text ?? outcome.description}
              </p>
              <FreshnessNote metadata={latestMetadata} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 md:px-8 md:py-14 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:px-12">
        <div className="flex min-w-0 flex-col gap-8">
          {result.eligibleDocuments.length > 0 ? (
            <section aria-labelledby="visa-options-heading">
              <div className="mb-5">
                <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">
                  Your visa option
                </p>
                <h2
                  id="visa-options-heading"
                  className="mt-1 font-heading text-2xl font-semibold tracking-tight md:text-3xl"
                >
                  What this visa includes
                </h2>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Review the stay rules and passport requirement before you
                  continue planning.
                </p>
              </div>

              <div className="flex flex-col gap-5">
                {result.eligibleDocuments.map((documentResult, index) => (
                  <VisaOptionCard
                    key={`${documentResult.document.visa_type_id ?? index}`}
                    documentResult={documentResult}
                  />
                ))}
              </div>
            </section>
          ) : (
            <NoVisaOption outcome={result.requirements.outcome} />
          )}

          <section aria-labelledby="next-steps-heading">
            <div className="mb-5">
              <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">
                Before you travel
              </p>
              <h2
                id="next-steps-heading"
                className="mt-1 font-heading text-2xl font-semibold tracking-tight"
              >
                A few important next steps
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <NextStep
                number="01"
                icon={NotebookTabsIcon}
                title="Check your passport"
                description="Make sure it meets the validity rule shown for your visa."
              />
              <NextStep
                number="02"
                icon={FileCheck2Icon}
                title="Confirm official rules"
                description="Verify the latest entry requirements before booking."
              />
              <NextStep
                number="03"
                icon={PlaneTakeoffIcon}
                title="Allow enough time"
                description="Apply early enough for processing before departure."
              />
            </div>
          </section>

          <Alert>
            <AlertCircleIcon />
            <AlertTitle>Requirements can change</AlertTitle>
            <AlertDescription>
              Always confirm the latest rules with the destination’s embassy or
              immigration authority before booking or departure. Final approval
              to enter is made by border officials.
            </AlertDescription>
          </Alert>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-28">
          <Card className="shadow-none">
            <CardHeader>
              <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <SearchIcon />
              </span>
              <CardTitle>Check another trip</CardTitle>
              <CardDescription>
                Change your passport country or destination.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VisaSearchForm
                initialValues={{
                  nationality: result.nationality,
                  destination: result.destination,
                }}
              />
            </CardContent>
          </Card>

          <Card size="sm" className="bg-primary/5 shadow-none">
            <CardHeader>
              <div className="flex gap-3">
                <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <CardTitle>Plan with confidence</CardTitle>
                  <CardDescription className="mt-1 leading-relaxed">
                    Eligibility, stay rules, passport needs, and available fees
                    are organized into one clear travel summary.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </aside>
      </div>
    </main>
  )
}

function VisaOptionCard({
  documentResult,
}: {
  documentResult: VisaDocumentResult
}) {
  const { document, product } = documentResult
  const validity = product?.validity ?? document.validity
  const fees = getVisibleFees(product)

  return (
    <Card className="shadow-none">
      <CardHeader className="border-b bg-muted/35">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge>{formatLabel(document.classification ?? "visa")}</Badge>
              {document.is_required ? (
                <Badge variant="secondary">Required for entry</Badge>
              ) : null}
            </div>
            <CardTitle className="text-xl md:text-2xl">
              {document.name ?? product?.product_name ?? "Travel visa"}
            </CardTitle>
            {document.reasons_for_travel?.length ? (
              <CardDescription className="mt-2">
                Suitable for {formatReasons(document.reasons_for_travel)}
              </CardDescription>
            ) : null}
          </div>
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <NotebookTabsIcon />
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-7">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TravelDetail
            icon={CalendarClockIcon}
            label="Visa valid for"
            value={asDisplayValue(validity?.visa_validity)}
          />
          <TravelDetail
            icon={Clock3Icon}
            label="Maximum stay"
            value={asDisplayValue(validity?.max_stay)}
          />
          <TravelDetail
            icon={DoorOpenIcon}
            label="Number of entries"
            value={asDisplayValue(validity?.num_entries)}
          />
          <TravelDetail
            icon={MoveRightIcon}
            label="Starts"
            value={asDisplayValue(validity?.starts)}
          />
        </div>

        {product ? (
          <>
            <Separator />
            <div className="grid gap-7 md:grid-cols-[1fr_1.2fr]">
              <div>
                <p className="text-sm font-medium">Passport requirement</p>
                <div className="mt-3 flex items-start gap-3 rounded-xl bg-muted p-4">
                  <NotebookTabsIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">
                      {formatPassportRequirement(product)}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Check the expiry date printed on your passport before you
                      apply.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">Estimated fees</p>
                {fees.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-3">
                    {fees.map((fee) => (
                      <div
                        key={fee.label}
                        className="flex items-center justify-between gap-4 rounded-xl border bg-background px-4 py-3"
                      >
                        <span className="flex items-center gap-3 text-sm text-muted-foreground">
                          <fee.icon className="size-4" />
                          {fee.label}
                        </span>
                        <span className="font-semibold">{fee.value}</span>
                      </div>
                    ))}
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Fees are shown separately and may not equal the final
                      amount. Processing choices, travelers, taxes, or extras
                      can change the total.
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Fee information is not currently available.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function TravelDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClockIcon
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <Icon className="mb-4 size-5 text-primary" />
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}

function NextStep({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: string
  icon: typeof NotebookTabsIcon
  title: string
  description: string
}) {
  return (
    <Card size="sm" className="shadow-none">
      <CardHeader>
        <div className="mb-4 flex items-center justify-between">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon />
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {number}
          </span>
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function NoVisaOption({ outcome }: { outcome: string }) {
  const visaNotRequired = outcome === "document_not_required"

  return (
    <Card className="shadow-none">
      <CardHeader className="items-center py-10 text-center md:py-14">
        <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          {visaNotRequired ? <CheckCircle2Icon /> : <InfoIcon />}
        </span>
        <CardTitle className="text-xl">
          {visaNotRequired
            ? "No visa option is needed"
            : "No online visa option is available here"}
        </CardTitle>
        <CardDescription className="max-w-lg leading-relaxed">
          {visaNotRequired
            ? "Keep checking official entry rules as your departure date gets closer."
            : "Contact the destination’s embassy or immigration authority for the correct application route."}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function FreshnessNote({ metadata }: { metadata: VisaResponseMetadata }) {
  if (!metadata.capturedAt) {
    return (
      <p className="mt-5 inline-flex items-center gap-2 text-sm text-primary-foreground/70">
        <SparklesIcon className="size-4" /> Checked just now
      </p>
    )
  }

  return (
    <p className="mt-5 inline-flex items-center gap-2 text-sm text-primary-foreground/70">
      <Clock3Icon className="size-4" /> Information updated{" "}
      {formatDate(metadata.capturedAt)}
    </p>
  )
}

function getLatestMetadata(result: VisaAssistanceResult) {
  const metadata = [result.metadata.requirements, result.metadata.products]
  return metadata.find((entry) => entry.capturedAt) ?? metadata[0]
}

function getVisibleFees(product: VisaProductOption | null) {
  if (!product) return []

  const fees: Array<{
    label: string
    value: string
    icon: typeof WalletCardsIcon
  }> = []
  const basePrice = formatBasePrice(product)

  if (basePrice) {
    fees.push({
      label: "Service fee",
      value: basePrice,
      icon: WalletCardsIcon,
    })
  }

  const displayedVisaCost =
    product.pricing?.visa_cost_pretty ??
    formatMoneyValue(product.pricing?.visa_cost, undefined)

  if (displayedVisaCost) {
    fees.push({
      label: product.pricing?.name ?? "Visa fee",
      value: displayedVisaCost,
      icon: CircleDollarSignIcon,
    })
  } else {
    const governmentFee = formatMoneyValue(
      product.validity?.gov_fee,
      product.validity?.base_price?.currency
    )
    if (governmentFee) {
      fees.push({
        label: "Government fee",
        value: governmentFee,
        icon: LandmarkIcon,
      })
    }
  }

  return fees
}

function formatReasons(reasons: string[]) {
  const labels = reasons.map(formatLabel)
  if (labels.length <= 1) return labels[0]
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function asDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not specified"
  }
  return String(value)
}

function formatBasePrice(product: VisaProductOption) {
  return formatMoneyValue(
    product.validity?.base_price?.price,
    product.validity?.base_price?.currency
  )
}

function formatMoneyValue(value: unknown, currency: string | undefined) {
  if (value === null || value === undefined || value === "") return null
  return currency ? `${currency} ${value}` : String(value)
}

function formatPassportRequirement(product: VisaProductOption) {
  const requirement = product.validity?.passport_requirements
  if (!requirement?.duration || !requirement.unit) {
    return "No specific validity period provided"
  }

  const unit =
    requirement.duration === 1
      ? requirement.unit.replace(/s$/, "")
      : requirement.unit
  const timing =
    requirement.exp_type === "arrival"
      ? " after arrival"
      : requirement.exp_type
        ? ` after ${formatLabel(requirement.exp_type).toLowerCase()}`
        : ""

  return `Valid for at least ${requirement.duration} ${unit}${timing}`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)
}
