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

type VisaResponseValidator = (payload: unknown) => boolean

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

function isMeaningfulValidationError(status: number) {
  return status === 400 || status === 422
}

async function hasUsableResponseBody(
  response: Response,
  validate: VisaResponseValidator
) {
  try {
    return validate(await response.clone().json())
  } catch {
    return false
  }
}

async function fetchWithVisaFallback(
  path: string,
  init?: RequestInit,
  dependencies: VisaFetchDependencies = {},
  validate: VisaResponseValidator = () => true
): Promise<ProviderResponse> {
  try {
    const liveResponse = await requestProvider(
      "ivisa",
      path,
      init,
      dependencies
    )

    if (isMeaningfulValidationError(liveResponse.status)) {
      return { response: liveResponse, source: "ivisa-live" }
    }

    if (
      liveResponse.ok &&
      (await hasUsableResponseBody(liveResponse, validate))
    ) {
      return { response: liveResponse, source: "ivisa-live" }
    }
  } catch {
    // Network failures, timeouts, and malformed responses use the snapshot API.
  }

  const fallbackResponse = await requestFallback(path, init, dependencies)
  return { response: fallbackResponse, source: "vacatina-snapshot" }
}

async function requestFallback(
  path: string,
  init: RequestInit | undefined,
  dependencies: VisaFetchDependencies
) {
  try {
    return await requestProvider("fallback", path, init, dependencies)
  } catch {
    // Retry once for a transient DNS, socket, or connection failure.
    return requestProvider("fallback", path, init, dependencies)
  }
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
    dependencies,
    isVisaRequirementsResponse
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
    dependencies,
    isVisaProductsResponse
  )
  return readApiResult<VisaProductsResponse>(result)
}

function isVisaRequirementsResponse(
  payload: unknown
): payload is VisaRequirementsResponse {
  return (
    isRecord(payload) &&
    typeof payload.outcome === "string" &&
    isRecord(payload.documents)
  )
}

function isVisaProductsResponse(
  payload: unknown
): payload is VisaProductsResponse {
  return isRecord(payload) && Array.isArray(payload.options)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
