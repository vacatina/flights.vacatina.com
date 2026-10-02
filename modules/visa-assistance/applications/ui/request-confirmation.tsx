import Link from "next/link"
import { ArrowRightIcon, CheckCircle2Icon, MailIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  visaFormCard,
  visaFormFooter,
} from "@/modules/visa-assistance/applications/ui/checkout-surfaces"
import { Money } from "@/modules/currency/ui"

import type { VisaApplicationDetail } from "../domain"

export function VisaRequestConfirmation({
  detail,
}: {
  detail: VisaApplicationDetail
}) {
  return (
    <main className="min-h-[calc(100svh-5rem)] bg-primary/[0.035] py-10 md:py-14">
      <div className="mx-auto w-full max-w-screen-2xl px-5 sm:px-8">
        <Card className={visaFormCard}>
          <CardContent className="grid items-center gap-10 px-6 py-8 md:px-10 lg:grid-cols-2">
            <div className="flex flex-col items-start">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                <CheckCircle2Icon className="size-7" aria-hidden="true" />
              </span>
              <Badge className="mt-6" variant="secondary">
                Request submitted
              </Badge>
              <h1 className="mt-4 font-heading text-3xl font-normal tracking-tight md:text-5xl">
                Visa request received
              </h1>
              <p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">
                Our team will review your information and contact you with the
                next steps and confirmed pricing. No payment has been taken.
              </p>
              <div className="mt-7 w-full rounded-[22px] bg-brand-navy p-6 text-white">
                <p className="text-xs font-medium tracking-wide text-white/70 uppercase">
                  Your reference
                </p>
                <p className="mt-2 font-heading text-2xl font-normal tracking-wide">
                  {detail.application.reference}
                </p>
                <p className="mt-3 flex items-center gap-2 text-xs text-white/70">
                  <MailIcon className="size-3.5" aria-hidden="true" />
                  Keep this reference for future communication.
                </p>
              </div>
            </div>
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
          <CardFooter
            className={`flex-col-reverse justify-end gap-3 sm:flex-row ${visaFormFooter}`}
          >
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
    <div className="min-w-0 rounded-2xl border border-primary/10 bg-primary/[0.035] p-5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-2 text-base font-medium [overflow-wrap:anywhere] tabular-nums">
        {value}
      </dd>
    </div>
  )
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}
