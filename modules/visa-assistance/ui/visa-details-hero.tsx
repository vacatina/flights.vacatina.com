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
      <div className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8 md:py-16 lg:px-12 lg:py-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-[#13357b] dark:text-blue-300">
            <OutcomeIcon className="size-4" aria-hidden="true" />
            {outcome.label}
          </div>
          <FreshnessNote metadata={latestMetadata} />
        </div>

        <h1 className="mt-8 max-w-4xl font-heading text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance md:text-6xl lg:text-[4.5rem]">
          {outcome.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {outcome.description}
        </p>

        <div className="mt-10 grid gap-6 border-t border-[#13357b]/12 pt-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end dark:border-border">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
            <CountryLabel
              label="Passport"
              code={nationality?.code ?? result.nationality}
              name={nationality?.name ?? result.nationality}
            />
            <ArrowRightIcon
              className="size-5 shrink-0 text-[#13357b] dark:text-blue-300"
              aria-hidden="true"
            />
            <CountryLabel
              label="Destination"
              code={destination?.code ?? result.destination}
              name={destination?.name ?? result.destination}
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
  code,
  name,
}: {
  label: string
  code: string
  name: string
}) {
  return (
    <div className="grid grid-cols-[2.75rem_1fr] items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-xl border border-[#13357b]/12 bg-background text-xs font-semibold tracking-wide text-[#13357b] dark:border-border dark:text-blue-300">
        {code.toUpperCase()}
      </span>
      <span>
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="mt-0.5 block text-sm font-semibold">{name}</span>
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
