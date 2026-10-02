import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { getVisaCountry } from "@/modules/visa-assistance/domain"
import { getPublicVisaResults } from "@/modules/visa-assistance/catalog/server/public-catalog"
import { PublicVisaResults } from "@/modules/visa-assistance/catalog/ui/public/results"

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
    description: `Explore Vacatina visa assistance services and estimated fees for ${nationalityCountry.name} passport holders traveling to ${destinationCountry.name}.`,
  }
}

export default async function VisaDetailsPage({
  params,
}: VisaDetailsPageProps) {
  await connection()
  const { nationality, destination } = await params

  const result = await getPublicVisaResults(nationality, destination)
  if (!result) notFound()
  return <PublicVisaResults {...result} />
}
