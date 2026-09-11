import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckCircle2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
    <main className="min-h-[calc(100svh-5rem)] bg-[#f5f7fb] py-12">
      <div className="mx-auto max-w-2xl px-4">
        <Card>
          <CardContent className="py-10 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2Icon className="size-7" />
            </span>
            <h1 className="mt-5 font-heading text-2xl font-semibold">
              Visa request received
            </h1>
            <p className="mt-3 text-muted-foreground">
              Your reference is{" "}
              <strong className="text-foreground">
                {detail.application.reference}
              </strong>
              . Our team will review the information and contact you with the
              next steps and confirmed pricing.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              No payment has been taken.
            </p>
            <dl className="mx-auto mt-7 grid max-w-lg gap-4 rounded-xl bg-muted/60 p-5 text-left sm:grid-cols-2">
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
                  detail.application.pricingSnapshot?.totalSellMoney ? (
                    <Money
                      money={detail.application.pricingSnapshot.totalSellMoney}
                    />
                  ) : (
                    "Unavailable"
                  )
                }
              />
            </dl>
            <Button
              className="mt-7"
              nativeButton={false}
              render={<Link href="/visa-assistance" />}
            >
              Back to visa assistance
            </Button>
          </CardContent>
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
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  )
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}
