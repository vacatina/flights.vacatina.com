import { visaPanel } from "./visa-surfaces"
import Link from "next/link"
import { ArrowLeftIcon, InfoIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PublicVisaDetail } from "../../domain/public-listing"
import { VisaRouteHeading } from "./route-heading"
import { ListingFacts, ListingReviewedDate } from "./listing-facts"
import { DocumentOverview } from "./document-overview"
import { ListingFeeSummary } from "./fee-summary"

export function PublicVisaDetails({ listing }: { listing: PublicVisaDetail }) {
  return (
    <main className="bg-primary/[0.035]">
      <VisaRouteHeading
        compact
        nationality={listing.nationalityCode}
        destination={listing.destinationCode}
        title={listing.title}
        description={listing.shortSummary}
      />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-5 py-6 sm:px-8 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button
            role="link"
            size="lg"
            variant="ghost"
            nativeButton={false}
            render={
              <Link
                href={`/visa-assistance/${listing.nationalityCode}/${listing.destinationCode}`}
              />
            }
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Back to visa services
          </Button>
          <ListingReviewedDate value={listing.reviewedAt} />
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <Card className={visaPanel}>
              <CardHeader>
                <CardTitle>
                  <h2>About this visa</h2>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-7">
                <p className="leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line">
                  {listing.fullDescription}
                </p>
                <ListingFacts listing={listing} />
                {listing.eligibilityNotes ? (
                  <CopySection
                    title="Eligibility"
                    text={listing.eligibilityNotes}
                  />
                ) : null}
                {listing.additionalNotes ? (
                  <CopySection
                    title="Additional information"
                    text={listing.additionalNotes}
                  />
                ) : null}
              </CardContent>
            </Card>
            <DocumentOverview documents={listing.documents} />
            <Alert className="rounded-2xl border-primary/15 bg-card">
              <InfoIcon />
              <AlertTitle>Before you travel</AlertTitle>
              <AlertDescription>
                Entry requirements can change. Confirm the latest requirements
                with the relevant embassy or immigration authority. Visa
                assistance does not guarantee approval.
              </AlertDescription>
            </Alert>
          </div>
          <ListingFeeSummary listing={listing} />
        </div>
      </div>
    </main>
  )
}

function CopySection({ title, text }: { title: string; text: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line">
        {text}
      </p>
    </section>
  )
}
