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
import {
  calculateVisaProductPricing,
  defaultVisaPricingRuleRepository,
  type VisaPricingRuleRepository,
} from "@/modules/visa-assistance/pricing/server"

export interface VisaServiceDependencies {
  fetchRequirements?: typeof fetchVisaRequirements
  fetchProducts?: typeof fetchVisaProducts
  pricingRuleRepository?: Pick<
    VisaPricingRuleRepository,
    "listActiveCandidates"
  >
  now?: () => Date
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
  const pricingRuleRepository =
    dependencies.pricingRuleRepository ?? defaultVisaPricingRuleRepository
  const now = dependencies.now?.() ?? new Date()

  // Keep the two upstream operations sequential. When the primary provider is
  // unavailable, this avoids opening competing connections to the fallback.
  const requirementsResult = await fetchRequirements(nationality, destination)
  const productsResult = await fetchProducts(nationality, destination)

  const eligibleDocuments = requirementsResult.data.documents?.eligible ?? []
  const products = productsResult.data.options ?? []
  const pricingRules = await pricingRuleRepository.listActiveCandidates(now)

  return {
    nationality,
    destination,
    requirements: requirementsResult.data,
    products: productsResult.data,
    eligibleDocuments: eligibleDocuments.map((document) => {
      const product = findMatchingProduct(document, products, nationality)
      return {
        document,
        product,
        pricing: product
          ? calculateVisaProductPricing({
              nationalityCode: nationality,
              destinationCode: destination,
              document,
              product,
              rules: pricingRules,
              now,
            })
          : null,
      }
    }),
    ineligibleDocuments: requirementsResult.data.documents?.ineligible ?? [],
    metadata: {
      requirements: requirementsResult.metadata,
      products: productsResult.metadata,
    },
  }
}
