import { getLiteApiConfig } from "./config"

interface LiteApiRequestOptions extends RequestInit {
  endpoint: string
  params?: Record<string, string>
}

export class LiteApiClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  private async fetchApi<T>({ endpoint, params, ...options }: LiteApiRequestOptions): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value)
        }
      })
    }

    const headers = new Headers(options.headers)
    headers.set("X-API-Key", this.apiKey)
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json")
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`LiteAPI Error ${response.status}: ${errorBody}`)
    }

    return response.json() as Promise<T>
  }

  async get<T>(endpoint: string, params?: Record<string, string>, options?: RequestInit) {
    return this.fetchApi<T>({ ...options, method: "GET", endpoint, params })
  }

  async post<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.fetchApi<T>({
      ...options,
      method: "POST",
      endpoint,
      body: JSON.stringify(body),
    })
  }
}

let liteApiClientInstance: LiteApiClient | null = null

export function getLiteApiClient() {
  if (!liteApiClientInstance) {
    const config = getLiteApiConfig()
    liteApiClientInstance = new LiteApiClient(config.apiKey, config.baseUrl)
  }
  return liteApiClientInstance
}
