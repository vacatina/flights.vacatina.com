import "server-only"

import type {
  VisaApiResult,
  VisaDataSource,
  VisaProductsResponse,
  VisaRequirementsResponse,
} from "@/modules/visa-assistance/domain"

const DEFAULT_IVISA_BASE_URL = "https://www.ivisa.com"
const DEFAULT_FALLBACK_BASE_URL = "https://vacatina-visa-api.vercel.app"
const DEFAULT_TIMEOUT_MS = 8_000

export interface VisaFetchDependencies {
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

type VisaProvider = "ivisa" | "fallback"

export class VisaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly provider: VisaProvider
  ) {
    super(message)
    this.name = "VisaApiError"
  }
}

interface ProviderResponse {
  response: Response
  source: VisaDataSource
}

function getBaseUrl(provider: VisaProvider) {
  switch (provider) {
    case "ivisa":
      return process.env.IVISA_API_BASE_URL ?? DEFAULT_IVISA_BASE_URL
    case "fallback":
      return process.env.VACATINA_VISA_API_BASE_URL ?? DEFAULT_FALLBACK_BASE_URL
  }
}

function getRequestHeaders(provider: VisaProvider, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  headers.set("Accept", "application/json")

  if (init?.body) {
    headers.set("Content-Type", "application/json")
  }

  if (provider === "fallback" && process.env.VACATINA_VISA_API_KEY) {
    headers.set("X-API-Key", process.env.VACATINA_VISA_API_KEY)
  }

  return headers
}

async function requestProvider(
  provider: VisaProvider,
  path: string,
  init?: RequestInit,
  dependencies: VisaFetchDependencies = {}
): Promise<Response> {
  const fetchImpl = dependencies.fetchImpl ?? fetch
  return fetchImpl(`${getBaseUrl(provider)}${path}`, {
    ...init,
    headers: getRequestHeaders(provider, init),
    cache: "no-store",
    signal: AbortSignal.timeout(dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  })
}

function shouldUseFallback(status: number) {
  switch (status) {
    case 429:
    case 500:
    case 501:
    case 502:
    case 503:
    case 504:
      return true
    default:
      return false
  }
}

async function fetchWithVisaFallback(
  path: string,
  init?: RequestInit,
  dependencies: VisaFetchDependencies = {}
): Promise<ProviderResponse> {
  try {
    const liveResponse = await requestProvider(
      "ivisa",
      path,
      init,
      dependencies
    )

    if (liveResponse.ok || !shouldUseFallback(liveResponse.status)) {
      return { response: liveResponse, source: "ivisa-live" }
    }
  } catch {
    // Network failures and timeouts intentionally continue to the snapshot API.
  }

  const fallbackResponse = await requestProvider(
    "fallback",
    path,
    init,
    dependencies
  )
  return { response: fallbackResponse, source: "vacatina-snapshot" }
}

async function readApiResult<T>(
  result: ProviderResponse
): Promise<VisaApiResult<T>> {
  const { response, source } = result

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string
    } | null
    const provider = source === "ivisa-live" ? "ivisa" : "fallback"
    throw new VisaApiError(
      payload?.message ??
        `Visa information is unavailable (${response.status})`,
      response.status,
      provider
    )
  }

  return {
    data: (await response.json()) as T,
    metadata: {
      source,
      capturedAt: response.headers.get("x-data-captured-at"),
    },
  }
}

export async function fetchVisaRequirements(
  nationality: string,
  destination: string,
  dependencies: VisaFetchDependencies = {}
) {
  const result = await fetchWithVisaFallback(
    `/visa/destination-requirements/${nationality}/${destination}`,
    undefined,
    dependencies
  )
  return readApiResult<VisaRequirementsResponse>(result)
}

export async function fetchVisaProducts(
  nationality: string,
  destination: string,
  currency = "USD",
  dependencies: VisaFetchDependencies = {}
) {
  const result = await fetchWithVisaFallback(
    "/product/reset-visa-type-names",
    {
      method: "POST",
      body: JSON.stringify({
        global_fields: { common_nationality_country: nationality },
        traveler_list: [[]],
        primary_product_classification: "visa",
        currency,
        destination_country_code: destination,
      }),
    },
    dependencies
  )
  return readApiResult<VisaProductsResponse>(result)
}
