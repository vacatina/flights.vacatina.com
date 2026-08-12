import "server-only"

import { countryCodeSchema } from "@/modules/visa-assistance/domain"
import type {
  VisaAssistanceResult,
  VisaDocument,
  VisaProductOption,
} from "@/modules/visa-assistance/domain"
import {
  fetchVisaProducts,
  fetchVisaRequirements,
} from "@/modules/visa-assistance/server/client"

export interface VisaServiceDependencies {
  fetchRequirements?: typeof fetchVisaRequirements
  fetchProducts?: typeof fetchVisaProducts
}

function normalizeId(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null
  }

  return String(value)
}

function findMatchingProduct(
  document: VisaDocument,
  products: VisaProductOption[],
  nationality: string
) {
  const visaTypeId = normalizeId(document.visa_type_id)
  const idMatch = visaTypeId
    ? products.find((product) => normalizeId(product.id) === visaTypeId)
    : undefined

  if (idMatch) {
    return idMatch
  }

  return (
    products.find((product) =>
      product.eligible_nationalities?.includes(nationality)
    ) ?? null
  )
}

export async function getVisaAssistanceResult(
  nationalityInput: string,
  destinationInput: string,
  dependencies: VisaServiceDependencies = {}
): Promise<VisaAssistanceResult> {
  const nationality = countryCodeSchema.parse(nationalityInput)
  const destination = countryCodeSchema.parse(destinationInput)

  const fetchRequirements =
    dependencies.fetchRequirements ?? fetchVisaRequirements
  const fetchProducts = dependencies.fetchProducts ?? fetchVisaProducts

  const [requirementsResult, productsResult] = await Promise.all([
    fetchRequirements(nationality, destination),
    fetchProducts(nationality, destination),
  ])

  const eligibleDocuments = requirementsResult.data.documents?.eligible ?? []
  const products = productsResult.data.options ?? []

  return {
    nationality,
    destination,
    requirements: requirementsResult.data,
    products: productsResult.data,
    eligibleDocuments: eligibleDocuments.map((document) => ({
      document,
      product: findMatchingProduct(document, products, nationality),
    })),
    ineligibleDocuments: requirementsResult.data.documents?.ineligible ?? [],
    metadata: {
      requirements: requirementsResult.metadata,
      products: productsResult.metadata,
    },
  }
}
