import Image from "next/image"
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
    title: "You’ll need a visa for this trip",
    description:
      "A visa option is available for this passport and destination.",
    icon: FileCheck2Icon,
  },
  document_not_required: {
    label: "Visa not required",
    title: "You can travel without a visa",
    description: "No additional visa requirement was found for this trip.",
    icon: CheckCircle2Icon,
  },
  document_unsupported: {
    label: "Visa may be required",
    title: "You may need to arrange your visa separately",
    description: "An online visa option is not currently available here.",
    icon: AlertCircleIcon,
  },
  other_document_supported: {
    label: "Travel document needed",
    title: "You may need another travel document",
    description: "Review the available document before making travel plans.",
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

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-center lg:gap-16 lg:px-12 lg:py-20">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-[#13357b] dark:text-blue-300">
          <OutcomeIcon className="size-4" aria-hidden="true" />
          {outcome.label}
        </div>

        <h1 className="mt-5 font-heading text-4xl leading-[1.08] font-semibold tracking-[-0.04em] text-balance md:text-5xl lg:text-[3.5rem]">
          {outcome.title}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {outcome.description}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <CountryLabel
            code={nationality?.code ?? result.nationality}
            name={nationality?.name ?? result.nationality}
            suffix="passport"
          />
          <ArrowRightIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <CountryLabel
            code={destination?.code ?? result.destination}
            name={destination?.name ?? result.destination}
          />
        </div>

        <FreshnessNote metadata={latestMetadata} />
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
        <Image
          src="/img/visa-assistance-travel.png"
          alt="Travel document and boarding pass in an airport lounge"
          fill
          priority
          sizes="(max-width: 1023px) 100vw, 44vw"
          className="object-cover"
        />
      </div>
    </section>
  )
}

function CountryLabel({
  code,
  name,
  suffix,
}: {
  code: string
  name: string
  suffix?: string
}) {
  return (
    <span className="inline-flex items-center gap-3 font-medium">
      <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-xs font-semibold tracking-wide text-[#13357b] dark:text-blue-300">
        {code.toUpperCase()}
      </span>
      <span>
        {name}
        {suffix ? ` ${suffix}` : ""}
      </span>
    </span>
  )
}

function FreshnessNote({ metadata }: { metadata: VisaResponseMetadata }) {
  return (
    <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Clock3Icon className="size-4" aria-hidden="true" />
      {metadata.capturedAt
        ? `Information updated ${formatDate(metadata.capturedAt)}`
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
