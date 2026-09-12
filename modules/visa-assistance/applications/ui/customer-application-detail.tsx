import Link from "next/link"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  DownloadIcon,
  FileTextIcon,
  MailIcon,
  PhoneIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  getCustomerVisaStatus,
  type VisaApplicationDetail,
} from "@/modules/visa-assistance/applications/domain"
import { VisaApplicationPricingEstimate } from "@/modules/visa-assistance/applications/ui/pricing-estimate"
import { getVisaCountry } from "@/modules/visa-assistance/domain"
import { CountryFlag } from "@/modules/visa-assistance/ui/country-flag"

export function CustomerVisaApplicationDetail({
  detail,
}: {
  detail: VisaApplicationDetail
}) {
  const { application, travelers, documents } = detail
  const status = getCustomerVisaStatus(application.status)
  const nationality = getVisaCountry(application.nationalityCode)
  const destination = getVisaCountry(application.destinationCode)
  const uploadedDocuments = documents.filter(
    (document) => document.status === "uploaded"
  )
  const isDraft = application.status === "draft"

  return (
    <div className="flex flex-col gap-6">
      {application.status === "needs_information" ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>We need more information</AlertTitle>
          <AlertDescription>
            Check the email sent to {application.contactEmail ?? "you"} for the
            requested details. Reply to that message so our team can continue
            the review.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
            {destination ? <CountryFlag src={destination.flagSrc} /> : null}
            {application.visaName}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{application.reference}</span>
            <span aria-hidden="true">·</span>
            {nationality ? <CountryFlag src={nationality.flagSrc} /> : null}
            <span>{nationality?.name ?? application.nationalityCode}</span>
            <span>to</span>
            <span>{destination?.name ?? application.destinationCode}</span>
          </CardDescription>
          <CardAction>
            <Badge variant={status.tone}>{status.label}</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="text-muted-foreground">{status.description}</p>
            <span className="font-medium tabular-nums">{status.progress}%</span>
          </div>
          <Progress value={status.progress} aria-label={status.description} />
        </CardContent>
        {isDraft ? (
          <CardFooter className="justify-end border-t bg-muted/20">
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link
                  href={`/visa-assistance/applications/${application.id}`}
                />
              }
            >
              Continue application
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Application details</CardTitle>
              <CardDescription>
                The trip and contact information submitted with this request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2">
                <Detail
                  icon={CalendarDaysIcon}
                  label="Planned entry"
                  value={application.entryDate ?? "Not added"}
                />
                <Detail
                  icon={UserRoundIcon}
                  label="Travelers"
                  value={application.travelerCount}
                />
                <Detail
                  icon={MailIcon}
                  label="Email"
                  value={application.contactEmail ?? "Not added"}
                />
                <Detail
                  icon={PhoneIcon}
                  label="Phone"
                  value={application.contactPhone ?? "Not added"}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Travelers</CardTitle>
              <CardDescription>
                Passport details are partially hidden for privacy.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {travelers.map((traveler, index) => {
                const country = getVisaCountry(traveler.nationalityCode)

                return (
                  <section
                    key={traveler.id}
                    className="rounded-lg bg-muted/40 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-full bg-background text-sm font-medium ring-1 ring-foreground/10">
                        {index + 1}
                      </span>
                      <h3 className="font-medium">
                        {traveler.title} {traveler.firstName}{" "}
                        {traveler.lastName}
                      </h3>
                      {country ? (
                        <span className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                          <CountryFlag src={country.flagSrc} />
                          {country.name}
                        </span>
                      ) : null}
                    </div>
                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                      <CompactDetail
                        label="Date of birth"
                        value={traveler.dateOfBirth}
                      />
                      <CompactDetail
                        label="Passport"
                        value={maskPassport(traveler.passportNumber)}
                      />
                      <CompactDetail
                        label="Passport expiry"
                        value={traveler.passportExpiryDate}
                      />
                    </dl>
                  </section>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Files currently attached to this visa request.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {uploadedDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-background ring-1 ring-foreground/10">
                    <FileTextIcon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {document.originalFilename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDocumentType(document.documentType)} ·{" "}
                      {formatFileSize(document.sizeBytes)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a
                        href={`/api/visa-applications/${application.id}/documents/${document.id}`}
                      />
                    }
                  >
                    <DownloadIcon data-icon="inline-start" />
                    Download
                  </Button>
                </div>
              ))}
              {uploadedDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No documents have been uploaded yet.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Estimated pricing</CardTitle>
            <CardDescription>
              The estimate saved with this request.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <VisaApplicationPricingEstimate
              pricing={application.pricingSnapshot}
            />
            <Separator />
            <dl className="flex flex-col gap-3 text-sm">
              <CompactDetail
                label="Created"
                value={formatDate(application.createdAt)}
              />
              <CompactDetail
                label="Submitted"
                value={
                  application.submittedAt
                    ? formatDate(application.submittedAt)
                    : "Not submitted"
                }
              />
            </dl>
            <p className="text-xs leading-relaxed text-muted-foreground">
              No payment was collected. The final price can change after the
              visa team reviews your information.
            </p>
          </CardContent>
          <CardFooter className="border-t bg-muted/20">
            <Button
              className="w-full"
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/visa-requests" />}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              All visa requests
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
      <CompactDetail label={label} value={value} />
    </div>
  )
}

function CompactDetail({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{value}</dd>
    </div>
  )
}

function maskPassport(passportNumber: string) {
  const visible = passportNumber.slice(-4)
  return `${"•".repeat(Math.max(passportNumber.length - 4, 4))}${visible}`
}

function formatDocumentType(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}
