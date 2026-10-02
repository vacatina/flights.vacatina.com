import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  Clock3Icon,
  FileCheck2Icon,
  FileQuestionIcon,
} from "lucide-react"

import {
  getVisaCountry,
  type VisaAssistanceResult,
  type VisaResponseMetadata,
} from "@/modules/visa-assistance/domain"
import { CountryFlag } from "@/modules/visa-assistance/ui/country-flag"

const outcomeContent = {
  visa_supported: {
    label: "Visa required",
    title: "A visa is required for your trip",
    description:
      "Review the available visa, prepare your details, and continue when you are ready.",
    icon: FileCheck2Icon,
  },
  document_not_required: {
    label: "Visa not required",
    title: "No visa is required for your trip",
    description:
      "Keep checking official entry requirements as your departure date approaches.",
    icon: CheckCircle2Icon,
  },
  document_unsupported: {
    label: "Visa may be required",
    title: "Arrange your visa through the embassy",
    description:
      "An online visa option is not currently available for this passport and destination.",
    icon: AlertCircleIcon,
  },
  other_document_supported: {
    label: "Travel document required",
    title: "Another travel document is required",
    description:
      "Review the available document before you confirm your travel plans.",
    icon: FileQuestionIcon,
  },
} as const

export function VisaDetailsHero({ result }: { result: VisaAssistanceResult }) {
  const nationality = getVisaCountry(result.nationality)
  const destination = getVisaCountry(result.destination)
  const outcome =
    outcomeContent[
      result.requirements.outcome as keyof typeof outcomeContent
    ] ?? outcomeContent.document_unsupported
  const OutcomeIcon = outcome.icon
  const latestMetadata = getLatestMetadata(result)
  const hasVisaOption = result.eligibleDocuments.length > 0

  return (
    <section className="border-b bg-[#eef3f8] dark:bg-muted/25">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-10 md:px-8 md:py-14 lg:px-12 lg:py-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-[#13357b] dark:text-blue-300">
            <OutcomeIcon className="size-4" aria-hidden="true" />
            {outcome.label}
          </div>
          <FreshnessNote metadata={latestMetadata} />
        </div>

        <h1 className="mt-7 max-w-4xl font-heading text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance md:text-6xl lg:text-[4.25rem]">
          {outcome.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {outcome.description}
        </p>

        <div className="mt-9 grid gap-5 rounded-2xl border border-[#13357b]/10 bg-background/85 p-4 shadow-[0_14px_36px_rgba(19,53,123,0.06)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-5 dark:border-border dark:bg-background/65 dark:shadow-none">
          <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] sm:gap-5">
            <CountryLabel
              label="Passport"
              name={nationality?.name ?? result.nationality}
              flagSrc={nationality?.flagSrc}
            />
            <span className="hidden size-10 items-center justify-center rounded-full bg-[#13357b]/7 text-[#13357b] sm:flex dark:bg-blue-300/10 dark:text-blue-300">
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </span>
            <CountryLabel
              label="Destination"
              name={destination?.name ?? result.destination}
              flagSrc={destination?.flagSrc}
            />
          </div>

          {hasVisaOption ? (
            <a
              href="#visa-options-heading"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#13357b] px-6 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-[#0f2b67] focus-visible:ring-3 focus-visible:ring-[#13357b]/30 focus-visible:outline-none active:translate-y-px md:w-auto"
            >
              Review your visa option
            </a>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function CountryLabel({
  label,
  name,
  flagSrc,
}: {
  label: string
  name: string
  flagSrc?: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1.5">
      {flagSrc ? (
        <CountryFlag
          src={flagSrc}
          className="h-8 w-12 rounded-md bg-background shadow-sm ring-foreground/12"
        />
      ) : null}
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-semibold md:text-base">
          {name}
        </span>
      </span>
    </div>
  )
}

function FreshnessNote({ metadata }: { metadata: VisaResponseMetadata }) {
  return (
    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Clock3Icon className="size-4" aria-hidden="true" />
      {metadata.capturedAt
        ? `Updated ${formatDate(metadata.capturedAt)}`
        : "Checked just now"}
    </p>
  )
}

function getLatestMetadata(result: VisaAssistanceResult) {
  const metadata = [result.metadata.requirements, result.metadata.products]
  return metadata.find((entry) => entry.capturedAt) ?? metadata[0]
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)
}
