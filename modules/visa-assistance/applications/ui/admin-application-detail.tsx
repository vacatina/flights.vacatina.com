import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { PendingSubmitButton } from "@/components/ui/pending-submit-button"
import { Textarea } from "@/components/ui/textarea"
import { Money } from "@/modules/currency/ui"
import {
  getVisaApplicationStatusLabel,
  VISA_APPLICATION_STATUSES,
} from "@/modules/visa-assistance/applications/domain"
import { updateVisaApplicationAdminAction } from "@/modules/visa-assistance/applications/server/actions"
import type { getAdminVisaApplicationDetail } from "@/modules/visa-assistance/applications/server/application-repository"

type AdminDetail = NonNullable<
  Awaited<ReturnType<typeof getAdminVisaApplicationDetail>>
>

export function AdminVisaApplicationDetail({
  detail,
}: {
  detail: AdminDetail
}) {
  const { application, travelers, documents, events } = detail

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Request overview</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Reference" value={application.reference} />
              <Detail
                label="Status"
                value={getVisaApplicationStatusLabel(application.status)}
              />
              <Detail label="Visa" value={application.visaName} />
              <Detail
                label="Route"
                value={`${application.nationalityCode} to ${application.destinationCode}`}
              />
              <Detail label="Entry date" value={application.entryDate} />
              <Detail label="Travelers" value={application.travelerCount} />
              <Detail label="Email" value={application.contactEmail} />
              <Detail label="Phone" value={application.contactPhone} />
              <Detail
                label="Estimated total"
                value={
                  application.pricingSnapshot?.totalSellMoney ? (
                    <Money money={application.pricingSnapshot.totalSellMoney} />
                  ) : (
                    "Unavailable"
                  )
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Travelers and documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {travelers.map((traveler, index) => {
              const travelerDocuments = documents.filter(
                (document) =>
                  document.travelerId === traveler.id &&
                  document.status === "uploaded"
              )

              return (
                <section key={traveler.id} className="rounded-lg border p-4">
                  <h3 className="font-semibold">
                    Traveler {index + 1}: {traveler.title} {traveler.firstName}{" "}
                    {traveler.lastName}
                  </h3>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <Detail
                      label="Nationality"
                      value={traveler.nationalityCode}
                    />
                    <Detail
                      label="Date of birth"
                      value={traveler.dateOfBirth}
                    />
                    <Detail
                      label="Passport number"
                      value={traveler.passportNumber}
                    />
                    <Detail
                      label="Passport expiry"
                      value={traveler.passportExpiryDate}
                    />
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {travelerDocuments.map((document) => (
                      <Button
                        key={document.id}
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={
                          <a
                            href={`/api/visa-applications/${application.id}/documents/${document.id}`}
                          />
                        }
                      >
                        {formatLabel(document.documentType)}
                      </Button>
                    ))}
                    {travelerDocuments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No uploaded documents.
                      </p>
                    ) : null}
                  </div>
                </section>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {events.map((event) => (
                <li key={event.id} className="border-l-2 pl-4">
                  <p className="text-sm font-medium">
                    {formatLabel(event.eventType)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(event.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card className="xl:sticky xl:top-6">
        <CardHeader>
          <CardTitle>Manage request</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateVisaApplicationAdminAction} className="space-y-5">
            <input type="hidden" name="applicationId" value={application.id} />
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={application.status}
                className="h-11 w-full rounded-md bg-muted/70 px-3 text-sm outline-none focus:ring-3 focus:ring-primary/10"
              >
                {VISA_APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getVisaApplicationStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="internalNotes">Internal notes</Label>
              <Textarea
                id="internalNotes"
                name="internalNotes"
                defaultValue={application.internalNotes ?? ""}
                rows={7}
                placeholder="Notes for the Vacatina operations team"
              />
              <p className="text-xs text-muted-foreground">
                Internal notes are never shown to the customer.
              </p>
            </div>
            <PendingSubmitButton
              className="w-full"
              pendingLabel="Saving changes..."
            >
              Save changes
            </PendingSubmitButton>
          </form>
          <Button
            className="mt-3 w-full"
            variant="outline"
            nativeButton={false}
            render={<Link href="/admin/visa-applications" />}
          >
            Back to visa requests
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value ?? "Not added"}</dd>
    </div>
  )
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}
