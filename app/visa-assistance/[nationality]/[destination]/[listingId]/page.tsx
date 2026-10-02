import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { getPublicVisaDetail } from "@/modules/visa-assistance/catalog/server/public-catalog"
import { PublicVisaDetails } from "@/modules/visa-assistance/catalog/ui/public/details"

interface ListingPageProps {
  params: Promise<{
    nationality: string
    destination: string
    listingId: string
  }>
}

export async function generateMetadata({
  params,
}: ListingPageProps): Promise<Metadata> {
  await connection()
  const { nationality, destination, listingId } = await params
  const listing = await getPublicVisaDetail(nationality, destination, listingId)
  if (!listing)
    return {
      title: "Visa service not available | Vacatina",
      robots: { index: false },
    }
  return {
    title: `${listing.title} | Vacatina`,
    description: listing.shortSummary,
  }
}

export default async function VisaListingPage({ params }: ListingPageProps) {
  await connection()
  const { nationality, destination, listingId } = await params
  const listing = await getPublicVisaDetail(nationality, destination, listingId)
  if (!listing) notFound()
  return <PublicVisaDetails listing={listing} />
}
