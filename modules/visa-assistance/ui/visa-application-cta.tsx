import { ExternalLinkIcon } from "lucide-react"

export function VisaApplicationCta({
  productId,
  nationality,
}: {
  productId: string | number | null | undefined
  nationality: string
}) {
  if (productId === null || productId === undefined || productId === "") {
    return null
  }

  const search = new URLSearchParams({
    product_id: String(productId),
    nationality,
  })

  return (
    <div className="grid gap-5 border-t px-5 py-6 md:grid-cols-[1fr_auto] md:items-center md:px-7 md:py-7">
      <div>
        <p className="font-semibold">Ready to continue?</p>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
          You will continue on iVisa, an external visa-processing service. Their
          fees and terms apply.
        </p>
      </div>
      <a
        href={`https://ivisatravel.com/apply?${search.toString()}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#13357b] px-6 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-[#0f2b67] focus-visible:ring-3 focus-visible:ring-[#13357b]/30 focus-visible:outline-none active:translate-y-px md:w-auto"
      >
        Continue application
        <ExternalLinkIcon data-icon="inline-end" aria-hidden="true" />
      </a>
    </div>
  )
}
