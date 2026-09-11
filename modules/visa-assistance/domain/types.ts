export type VisaOutcome =
  | "visa_supported"
  | "document_not_required"
  | "document_unsupported"
  | "other_document_supported"
  | (string & {})

export interface VisaDocumentValidity extends Record<string, unknown> {
  visa_validity?: string | null
  num_entries?: string | null
  max_stay?: string | null
  starts?: string | null
}

export interface VisaDocument extends Record<string, unknown> {
  visa_type_id?: string | number
  product_id?: string | number
  name?: string
  classification?: string
  classification_group?: string
  is_visa?: boolean
  is_required?: boolean
  requirement_phrase?: string
  validity?: VisaDocumentValidity
  reasons_for_travel?: string[]
}

export interface VisaRequirementsResponse extends Record<string, unknown> {
  outcome: VisaOutcome
  requires_document?: boolean
  visa_required_to_enter_destination?: boolean
  visas_available?: boolean
  requirement_text?: string
  documents?: {
    eligible?: VisaDocument[]
    ineligible?: VisaDocument[]
  }
}

export interface VisaBasePrice extends Record<string, unknown> {
  id?: string | number
  price?: string | number
  currency?: string
  min_price_usd?: string | number
  base_price_usd?: string | number
  sku?: string | number
}

export interface VisaProductValidity extends VisaDocumentValidity {
  visa_validity_days?: number
  max_stay_short?: string | null
  passport_requirements?: {
    duration?: number
    unit?: string
    exp_type?: string
    [key: string]: unknown
  }
  base_price?: VisaBasePrice
  gov_fee?: string | number
}

export interface VisaProductOption extends Record<string, unknown> {
  id?: string | number
  name?: string
  value?: string
  product_id?: string | number
  product_name?: string
  product_name_short?: string
  visa_classification?: string
  eligible_nationalities?: string[]
  unlisted?: boolean
  show_if?: {
    field_name?: string
    condition?: string
    value?: string[]
    [key: string]: unknown
  }
  validity?: VisaProductValidity
  pricing?: {
    visa_cost?: string | number
    visa_cost_pretty?: string
    name?: string
    price_append?: string
    is_visa_cost_paid_later?: boolean
    [key: string]: unknown
  }
}

export interface VisaProductsResponse extends Record<string, unknown> {
  options?: VisaProductOption[]
}

export type VisaDataSource = "ivisa-live" | "vacatina-snapshot"

export interface VisaResponseMetadata {
  source: VisaDataSource
  capturedAt: string | null
}

export interface VisaApiResult<T> {
  data: T
  metadata: VisaResponseMetadata
}

export interface VisaDocumentResult {
  document: VisaDocument
  product: VisaProductOption | null
  pricing?: VisaProductPricing | null
}

export interface VisaAssistanceResult {
  nationality: string
  destination: string
  requirements: VisaRequirementsResponse
  products: VisaProductsResponse
  eligibleDocuments: VisaDocumentResult[]
  ineligibleDocuments: VisaDocument[]
  metadata: {
    requirements: VisaResponseMetadata
    products: VisaResponseMetadata
  }
}
import type { VisaProductPricing } from "@/modules/visa-assistance/pricing/domain"
