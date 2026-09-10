import {
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  Clock3Icon,
  DoorOpenIcon,
  InfoIcon,
  LandmarkIcon,
  MoveRightIcon,
  NotebookTabsIcon,
  WalletCardsIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  type VisaDocumentResult,
  type VisaProductOption,
} from "@/modules/visa-assistance/domain"
import { VisaApplicationCta } from "@/modules/visa-assistance/ui/visa-application-cta"

export function VisaOptionsSection({
  documents,
  outcome,
  nationality,
}: {
  documents: VisaDocumentResult[]
  outcome: string
  nationality: string
}) {
  if (documents.length === 0) {
    return <NoVisaOption outcome={outcome} />
  }

  return (
    <section aria-labelledby="visa-options-heading">
      <h2
        id="visa-options-heading"
        className="font-heading text-2xl font-semibold tracking-[-0.025em] md:text-3xl"
      >
        Your visa option
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
        Review the stay rules, passport requirement, and available fees.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {documents.map((documentResult, index) => (
          <VisaOption
            key={`${documentResult.document.visa_type_id ?? index}`}
            documentResult={documentResult}
            nationality={nationality}
          />
        ))}
      </div>
    </section>
  )
}

function VisaOption({
  documentResult,
  nationality,
}: {
  documentResult: VisaDocumentResult
  nationality: string
}) {
  const { document, product } = documentResult
  const validity = product?.validity ?? document.validity
  const fees = getVisibleFees(product)

  return (
    <article className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-5 px-5 py-6 md:px-7 md:py-7">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge className="rounded-md bg-[#13357b] text-white hover:bg-[#13357b]">
              {formatLabel(document.classification ?? "visa")}
            </Badge>
            {document.is_required ? (
              <Badge variant="secondary" className="rounded-md">
                Required for entry
              </Badge>
            ) : null}
          </div>
          <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
            {document.name ?? product?.product_name ?? "Travel visa"}
          </h3>
          {document.reasons_for_travel?.length ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Suitable for {formatReasons(document.reasons_for_travel)}
            </p>
          ) : null}
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#13357b]/8 text-[#13357b] dark:bg-blue-300/10 dark:text-blue-300">
          <NotebookTabsIcon className="size-5" aria-hidden="true" />
        </span>
      </header>

      <div className="grid bg-[#f1f5fa] sm:grid-cols-2 xl:grid-cols-4 dark:bg-muted/40">
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
        <div className="grid gap-8 border-t px-5 py-7 md:px-7 lg:grid-cols-2 lg:gap-10">
          <div>
            <h4 className="text-sm font-semibold">Passport requirement</h4>
            <div className="mt-4 flex items-start gap-3">
              <NotebookTabsIcon
                className="mt-0.5 size-5 shrink-0 text-[#13357b] dark:text-blue-300"
                aria-hidden="true"
              />
              <div>
                <p className="font-medium">
                  {formatPassportRequirement(product)}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Check the expiry date printed on your passport before
                  applying.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Estimated fees</h4>
            {fees.length > 0 ? (
              <div className="mt-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {fees.map((fee) => (
                    <div key={fee.label} className="rounded-xl bg-muted/70 p-4">
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <fee.icon className="size-4" aria-hidden="true" />
                        {fee.label}
                      </span>
                      <p className="mt-2 text-lg font-semibold tracking-tight">
                        {fee.value}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Fees are shown separately. Processing choices, taxes, or
                  extras can change the final amount.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Fee information is not currently available.
              </p>
            )}
          </div>
        </div>
      ) : null}

      <VisaApplicationCta
        productId={product?.product_id ?? document.product_id}
        nationality={nationality}
      />
    </article>
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
    <div className="p-5">
      <Icon
        className="mb-4 size-5 text-[#13357b] dark:text-blue-300"
        aria-hidden="true"
      />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function NoVisaOption({ outcome }: { outcome: string }) {
  const visaNotRequired = outcome === "document_not_required"
  const Icon = visaNotRequired ? CheckCircle2Icon : InfoIcon

  return (
    <section aria-labelledby="visa-options-heading">
      <h2
        id="visa-options-heading"
        className="font-heading text-2xl font-semibold tracking-[-0.025em] md:text-3xl"
      >
        Your travel document
      </h2>
      <div className="mt-6 flex items-start gap-4 rounded-2xl bg-[#f1f5fa] p-6 md:p-8 dark:bg-card">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#13357b]/8 text-[#13357b] dark:bg-blue-300/10 dark:text-blue-300">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            {visaNotRequired
              ? "No visa option is needed"
              : "No online visa option is available here"}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {visaNotRequired
              ? "Keep checking official entry rules as your departure date gets closer."
              : "Contact the destination’s embassy or immigration authority for the correct application route."}
          </p>
        </div>
      </div>
    </section>
  )
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
    fees.push({ label: "Service fee", value: basePrice, icon: WalletCardsIcon })
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
