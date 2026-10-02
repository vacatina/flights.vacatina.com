import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRightIcon, CheckCircle2Icon, MailIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Money } from "@/modules/currency/ui"
import { loadOwnedVisaApplicationPage } from "@/modules/visa-assistance/applications/server"

export default async function VisaApplicationConfirmationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params
  const basePath = `/visa-assistance/applications/${applicationId}`
  const path = `${basePath}/confirmation`
  const { detail } = await loadOwnedVisaApplicationPage(applicationId, path)

  if (detail.application.status === "draft") {
    redirect(`${basePath}/review`)
  }

  return (
    <main className="min-h-[calc(100svh-5rem)] bg-muted/30 py-12 md:py-16">
      <div className="w-full mx-auto max-w-screen-2xl px-4">
        <Card>
          <CardContent className="flex flex-col items-center px-6 py-10 text-center md:px-10">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
              <CheckCircle2Icon className="size-7" aria-hidden="true" />
            </span>
            <Badge className="mt-6" variant="secondary">
              Request submitted
            </Badge>
            <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              Visa request received
            </h1>
            <p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">
              Our team will review your information and contact you with the
              next steps and confirmed pricing. No payment has been taken.
            </p>
            <div className="mt-7 w-full rounded-xl bg-primary/5 p-5 ring-1 ring-primary/15">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Your reference
              </p>
              <p className="mt-1 font-heading text-xl font-semibold tracking-wide">
                {detail.application.reference}
              </p>
              <p className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <MailIcon className="size-3.5" aria-hidden="true" />
                Keep this reference for future communication.
              </p>
            </div>
            <Separator className="my-7" />
            <dl className="grid w-full gap-5 text-left sm:grid-cols-2">
              <ConfirmationDetail
                label="Submitted"
                value={
                  detail.application.submittedAt
                    ? formatDate(detail.application.submittedAt)
                    : "Received"
                }
              />
              <ConfirmationDetail
                label="Visa"
                value={detail.application.visaName}
              />
              <ConfirmationDetail
                label="Travelers"
                value={detail.application.travelerCount}
              />
              <ConfirmationDetail
                label="Submitted estimate"
                value={
                  detail.application.pricingSnapshot?.totalMoney ? (
                    <Money
                      money={detail.application.pricingSnapshot.totalMoney}
                    />
                  ) : (
                    "Unavailable"
                  )
                }
              />
            </dl>
          </CardContent>
          <CardFooter className="flex-col-reverse justify-center gap-3 border-t bg-muted/20 sm:flex-row">
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/visa-assistance" />}
            >
              Start another request
            </Button>
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/visa-requests" />}
            >
              View my visa requests
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}

function ConfirmationDetail({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  )
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}
