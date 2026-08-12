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
  ShieldCheckIcon,
  TagIcon,
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
  type VisaDataSource,
  type VisaDocumentResult,
  type VisaProductOption,
  type VisaResponseMetadata,
} from "@/modules/visa-assistance/domain"
import { ApiDataAccordion } from "@/modules/visa-assistance/ui/api-data-accordion"
import { VisaSearchForm } from "@/modules/visa-assistance/ui/visa-search-form"

interface VisaDetailsProps {
  result: VisaAssistanceResult
}

const outcomeContent = {
  visa_supported: {
    eyebrow: "Visa required",
    title: "A visa is required for this trip",
    icon: FileCheck2Icon,
  },
  document_not_required: {
    eyebrow: "No additional document found",
    title: "A visa is not required for this trip",
    icon: CheckCircle2Icon,
  },
  document_unsupported: {
    eyebrow: "Document required",
    title: "A document is required, but no eligible product was found",
    icon: AlertCircleIcon,
  },
  other_document_supported: {
    eyebrow: "Travel document available",
    title: "Another travel document may be needed",
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
  const matchedProductIds = new Set(
    result.eligibleDocuments.flatMap(({ product }) =>
      product?.id === undefined ? [] : [String(product.id)]
    )
  )
  const additionalProducts = (result.products.options ?? []).filter(
    (product) =>
      product.id === undefined || !matchedProductIds.has(String(product.id))
  )

  return (
    <main className="bg-muted/40">
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          className="absolute inset-0 [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:42px_42px] opacity-10"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-7xl px-5 py-12 md:px-8 md:py-16 lg:px-12">
          <div className="flex flex-wrap items-center gap-3 text-sm text-primary-foreground/75">
            <span className="inline-flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">
                {nationality?.emoji}
              </span>
              {nationality?.name ?? result.nationality}
            </span>
            <ArrowRightIcon className="size-4" />
            <span className="inline-flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">
                {destination?.emoji}
              </span>
              {destination?.name ?? result.destination}
            </span>
          </div>

          <div className="mt-8 grid gap-7 lg:grid-cols-[auto_1fr] lg:items-start">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-foreground text-primary shadow-lg">
              <OutcomeIcon />
            </span>
            <div className="max-w-4xl">
              <p className="text-sm font-semibold tracking-[0.16em] text-primary-foreground/70 uppercase">
                {outcome.eyebrow}
              </p>
              <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.035em] text-balance md:text-5xl">
                {outcome.title}
              </h1>
              {result.requirements.requirement_text ? (
                <p className="mt-5 max-w-3xl text-lg leading-relaxed text-pretty text-primary-foreground/80">
                  {result.requirements.requirement_text}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 md:px-8 md:py-14 lg:px-12">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Check another trip</CardTitle>
            <CardDescription>
              Change either country to refresh the requirements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisaSearchForm
              compact
              initialValues={{
                nationality: result.nationality,
                destination: result.destination,
              }}
            />
          </CardContent>
        </Card>

        <section aria-labelledby="decision-overview-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">
                Decision overview
              </p>
              <h2
                id="decision-overview-heading"
                className="mt-1 font-heading text-2xl font-semibold tracking-tight"
              >
                What the API says
              </h2>
            </div>
            <SourceSummary metadata={result.metadata.requirements} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DecisionCard
              icon={NotebookTabsIcon}
              label="Document required"
              value={formatBoolean(result.requirements.requires_document)}
            />
            <DecisionCard
              icon={PlaneTakeoffIcon}
              label="Visa required"
              value={formatBoolean(
                result.requirements.visa_required_to_enter_destination
              )}
            />
            <DecisionCard
              icon={ShieldCheckIcon}
              label="Visa available"
              value={formatBoolean(result.requirements.visas_available)}
            />
            <DecisionCard
              icon={TagIcon}
              label="API outcome"
              value={formatLabel(result.requirements.outcome)}
            />
          </div>
        </section>

        <Separator />

        <section aria-labelledby="eligible-documents-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">
                Eligible documents
              </p>
              <h2
                id="eligible-documents-heading"
                className="mt-1 font-heading text-2xl font-semibold tracking-tight"
              >
                Visa options for this passport
              </h2>
            </div>
            <SourceSummary metadata={result.metadata.products} />
          </div>

          {result.eligibleDocuments.length > 0 ? (
            <div className="flex flex-col gap-5">
              {result.eligibleDocuments.map((documentResult, index) => (
                <EligibleDocumentCard
                  key={`${documentResult.document.visa_type_id ?? index}`}
                  documentResult={documentResult}
                />
              ))}
            </div>
          ) : (
            <Alert>
              <InfoIcon />
              <AlertTitle>No eligible visa product returned</AlertTitle>
              <AlertDescription>
                The requirements endpoint did not return an eligible document
                for this passport and destination combination.
              </AlertDescription>
            </Alert>
          )}
        </section>

        {result.ineligibleDocuments.length > 0 ||
        additionalProducts.length > 0 ? (
          <section aria-labelledby="other-api-data-heading">
            <div className="mb-5">
              <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">
                Other API results
              </p>
              <h2
                id="other-api-data-heading"
                className="mt-1 font-heading text-2xl font-semibold tracking-tight"
              >
                Returned, but not confirmed eligible
              </h2>
            </div>

            <Alert className="mb-5">
              <InfoIcon />
              <AlertTitle>Eligibility matters</AlertTitle>
              <AlertDescription>
                Product data alone does not prove eligibility. The items below
                were returned by an API but were not matched to an eligible
                document for this passport.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              {result.ineligibleDocuments.map((document, index) => (
                <Card key={`ineligible-${document.visa_type_id ?? index}`}>
                  <CardHeader>
                    <Badge variant="outline" className="mb-2">
                      Ineligible document
                    </Badge>
                    <CardTitle>{document.name ?? "Unnamed document"}</CardTitle>
                    <CardDescription>
                      {document.requirement_phrase ??
                        formatLabel(document.classification ?? "document")}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
              {additionalProducts.map((product, index) => (
                <OtherProductCard
                  key={`product-${product.id ?? index}`}
                  product={product}
                />
              ))}
            </div>
          </section>
        ) : null}

        <Separator />

        <section aria-labelledby="complete-api-data-heading">
          <div className="mb-5">
            <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">
              Complete API data
            </p>
            <h2
              id="complete-api-data-heading"
              className="mt-1 font-heading text-2xl font-semibold tracking-tight"
            >
              Every field returned by both endpoints
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Expand either response to inspect the original data without
              presentation or calculation changes.
            </p>
          </div>
          <ApiDataAccordion
            requirements={result.requirements}
            products={result.products}
          />
        </section>

        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Confirm before you travel</AlertTitle>
          <AlertDescription>
            Visa requirements and prices can change without notice. Treat this
            result as assistance and verify the latest rules with the relevant
            embassy or immigration authority before booking or departure.
          </AlertDescription>
        </Alert>
      </div>
    </main>
  )
}

function DecisionCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof NotebookTabsIcon
  label: string
  value: string
}) {
  return (
    <Card size="sm" className="shadow-none">
      <CardHeader>
        <span className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon />
        </span>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function EligibleDocumentCard({
  documentResult,
}: {
  documentResult: VisaDocumentResult
}) {
  const { document, product } = documentResult
  const validity = product?.validity ?? document.validity

  return (
    <Card className="shadow-none">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge>{formatLabel(document.classification ?? "visa")}</Badge>
              {document.is_required ? (
                <Badge variant="secondary">Required</Badge>
              ) : null}
              {product?.unlisted ? (
                <Badge variant="outline">Unlisted</Badge>
              ) : null}
            </div>
            <CardTitle className="text-xl">
              {document.name ?? product?.product_name ?? "Visa document"}
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-relaxed">
              {document.requirement_phrase}
            </CardDescription>
          </div>
          {product?.product_name_short ? (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <NotebookTabsIcon />
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-7">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailTile
            icon={CalendarClockIcon}
            label="Visa validity"
            value={asDisplayValue(validity?.visa_validity)}
          />
          <DetailTile
            icon={DoorOpenIcon}
            label="Entries"
            value={asDisplayValue(validity?.num_entries)}
          />
          <DetailTile
            icon={Clock3Icon}
            label="Maximum stay"
            value={asDisplayValue(validity?.max_stay)}
          />
          <DetailTile
            icon={MoveRightIcon}
            label="Validity starts"
            value={asDisplayValue(validity?.starts)}
          />
        </div>

        {product ? (
          <>
            <Separator />
            <div>
              <h3 className="font-heading text-base font-medium">
                Captured fees and passport rules
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Fee fields are shown separately exactly as supplied by the API.
              </p>
            </div>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <LabeledValue
                icon={WalletCardsIcon}
                label="Base / service price"
                value={formatBasePrice(product)}
              />
              <LabeledValue
                icon={LandmarkIcon}
                label="Government fee metadata"
                value={asDisplayValue(product.validity?.gov_fee)}
              />
              <LabeledValue
                icon={CircleDollarSignIcon}
                label={product.pricing?.name ?? "Displayed visa cost"}
                value={
                  product.pricing?.visa_cost_pretty ??
                  asDisplayValue(product.pricing?.visa_cost)
                }
              />
              <LabeledValue
                icon={NotebookTabsIcon}
                label="Passport validity required"
                value={formatPassportRequirement(product)}
              />
              <LabeledValue
                icon={TagIcon}
                label="Product ID"
                value={asDisplayValue(product.product_id)}
              />
              <LabeledValue
                icon={FileCheck2Icon}
                label="Visa type ID"
                value={asDisplayValue(product.id)}
              />
            </div>
          </>
        ) : (
          <Alert>
            <InfoIcon />
            <AlertTitle>No matching product detail</AlertTitle>
            <AlertDescription>
              The eligibility response returned this document, but no product
              option with the same visa type ID was found.
            </AlertDescription>
          </Alert>
        )}

        {document.reasons_for_travel?.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Travel reasons
            </span>
            {document.reasons_for_travel.map((reason) => (
              <Badge key={reason} variant="outline">
                {formatLabel(reason)}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function OtherProductCard({ product }: { product: VisaProductOption }) {
  return (
    <Card>
      <CardHeader>
        <Badge variant="outline" className="mb-2">
          Unmatched product
        </Badge>
        <CardTitle>
          {product.product_name ?? product.name ?? "Unnamed product"}
        </CardTitle>
        <CardDescription>
          {[
            product.validity?.visa_validity,
            product.validity?.num_entries,
            product.validity?.max_stay,
          ]
            .filter(Boolean)
            .join(" · ") || "No summary details returned"}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function DetailTile({
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

function LabeledValue({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof NotebookTabsIcon
  label: string
  value: string
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-medium">{value}</p>
      </div>
    </div>
  )
}

function SourceSummary({ metadata }: { metadata: VisaResponseMetadata }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{sourceLabel(metadata.source)}</Badge>
      {metadata.capturedAt ? (
        <span className="text-xs text-muted-foreground">
          Captured {formatCapturedAt(metadata.capturedAt)}
        </span>
      ) : null}
    </div>
  )
}

function sourceLabel(source: VisaDataSource) {
  return source === "ivisa-live" ? "Live iVisa data" : "Vacatina snapshot"
}

function formatCapturedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date) + " UTC"
}

function formatBoolean(value: boolean | undefined) {
  if (value === undefined) return "Not provided"
  return value ? "Yes" : "No"
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function asDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not provided"
  }
  return String(value)
}

function formatBasePrice(product: VisaProductOption) {
  const price = product.validity?.base_price?.price
  const currency = product.validity?.base_price?.currency
  if (price === null || price === undefined) return "Not provided"
  return currency ? `${currency} ${price}` : String(price)
}

function formatPassportRequirement(product: VisaProductOption) {
  const requirement = product.validity?.passport_requirements
  if (!requirement?.duration || !requirement.unit) return "Not provided"
  const timing = requirement.exp_type
    ? ` after ${formatLabel(requirement.exp_type)}`
    : ""
  return `${requirement.duration} ${requirement.unit}${timing}`
}
