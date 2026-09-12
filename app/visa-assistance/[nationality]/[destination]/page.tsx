import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getVisaCountry } from "@/modules/visa-assistance/domain"
import { getVisaAssistanceResult } from "@/modules/visa-assistance/server"
import { VisaDetails } from "@/modules/visa-assistance/ui"

interface VisaDetailsPageProps {
  params: Promise<{
    nationality: string
    destination: string
  }>
}

export async function generateMetadata({
  params,
}: VisaDetailsPageProps): Promise<Metadata> {
  const { nationality, destination } = await params
  const nationalityCountry = getVisaCountry(nationality)
  const destinationCountry = getVisaCountry(destination)

  if (!nationalityCountry || !destinationCountry) {
    return { title: "Visa details | Vacatina" }
  }

  return {
    title: `${nationalityCountry.name} to ${destinationCountry.name} visa | Vacatina`,
    description: `Visa and travel-document requirements for ${nationalityCountry.name} passport holders traveling to ${destinationCountry.name}.`,
  }
}

export default async function VisaDetailsPage({
  params,
}: VisaDetailsPageProps) {
  const { nationality, destination } = await params

  if (!getVisaCountry(nationality) || !getVisaCountry(destination)) {
    notFound()
  }

  const result = await getVisaAssistanceResult(nationality, destination)
  return <VisaDetails result={result} />
}
