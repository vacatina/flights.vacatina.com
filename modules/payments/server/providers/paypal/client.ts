import "server-only"

export type PayPalEnvironment = "sandbox" | "live"

export interface PayPalConfig {
  environment: PayPalEnvironment
  clientId: string
  clientSecret: string
  webhookId: string
  baseUrl: string
}

export interface PayPalAmount {
  currency_code: string
  value: string
}

export interface PayPalOrder {
  id: string
  status?: string
  purchase_units?: PayPalPurchaseUnit[]
}

export interface PayPalCapture {
  id: string
  status?: string
  amount?: PayPalAmount
}

export interface PayPalCaptureOrder {
  id: string
  status?: string
  purchase_units?: PayPalPurchaseUnit[]
}

export interface PayPalWebhookEvent {
  id?: string
  event_type?: string
  resource?: unknown
  [key: string]: unknown
}

interface PayPalPurchaseUnit {
  reference_id?: string
  custom_id?: string
  invoice_id?: string
  amount?: PayPalAmount
  payments?: {
    captures?: PayPalCapture[]
  }
}

const ZERO_MINOR_UNIT_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "UYI",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
])

const THREE_MINOR_UNIT_CURRENCIES = new Set([
  "BHD",
  "IQD",
  "JOD",
  "KWD",
  "LYD",
  "OMR",
  "TND",
])

let cachedConfig: PayPalConfig | null = null
let cachedAccessToken: { token: string; expiresAt: number } | null = null

export function getPayPalConfig(): PayPalConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const environment = toPayPalEnvironment(process.env.PAYPAL_ENV)

  cachedConfig = {
    environment,
    clientId: requiredEnv("PAYPAL_CLIENT_ID"),
    clientSecret: requiredEnv("PAYPAL_CLIENT_SECRET"),
    webhookId: requiredEnv("PAYPAL_WEBHOOK_ID"),
    baseUrl:
      environment === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com",
  }

  return cachedConfig
}

export async function createPayPalOrder(input: {
  checkoutSessionId: string
  partialOfferRequestId: string
  quoteId: string
  offerId: string
  amount: number
  currency: string
  contactEmail: string
}): Promise<PayPalOrder> {
  return paypalRequest<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.checkoutSessionId,
          custom_id: input.checkoutSessionId,
          invoice_id: input.checkoutSessionId,
          description: `Flight booking ${input.partialOfferRequestId}`,
          amount: toPayPalAmount(input.amount, input.currency),
        },
      ],
      payer: {
        email_address: input.contactEmail,
      },
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    },
    requestId: input.checkoutSessionId,
  })
}

export async function getPayPalOrder(orderId: string): Promise<PayPalOrder> {
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
  })
}

export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureOrder> {
  return paypalRequest<PayPalCaptureOrder>(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: "POST",
      body: {},
      requestId: `${orderId}:capture`,
    }
  )
}

export async function verifyPayPalWebhookSignature(input: {
  headers: Headers
  event: PayPalWebhookEvent
}): Promise<boolean> {
  const config = getPayPalConfig()

  const result = await paypalRequest<{ verification_status?: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: {
        auth_algo: input.headers.get("paypal-auth-algo"),
        cert_url: input.headers.get("paypal-cert-url"),
        transmission_id: input.headers.get("paypal-transmission-id"),
        transmission_sig: input.headers.get("paypal-transmission-sig"),
        transmission_time: input.headers.get("paypal-transmission-time"),
        webhook_id: config.webhookId,
        webhook_event: input.event,
      },
    }
  )

  return result.verification_status === "SUCCESS"
}

export function toPayPalAmount(amount: number, currency: string): PayPalAmount {
  const normalizedCurrency = currency.trim().toUpperCase()
  const digits = paypalCurrencyMinorUnit(normalizedCurrency)

  return {
    currency_code: normalizedCurrency,
    value: amount.toFixed(digits),
  }
}

function paypalCurrencyMinorUnit(currency: string) {
  if (ZERO_MINOR_UNIT_CURRENCIES.has(currency)) {
    return 0
  }

  if (THREE_MINOR_UNIT_CURRENCIES.has(currency)) {
    return 3
  }

  return 2
}

export function getPayPalCaptureFromOrder(order: PayPalCaptureOrder): PayPalCapture | null {
  for (const unit of order.purchase_units ?? []) {
    const capture = unit.payments?.captures?.[0]

    if (capture) {
      return capture
    }
  }

  return null
}

export function getPayPalCheckoutSessionIdFromResource(resource: unknown): string | null {
  if (!resource || typeof resource !== "object") {
    return null
  }

  const value = resource as {
    custom_id?: unknown
    invoice_id?: unknown
    supplementary_data?: {
      related_ids?: {
        order_id?: unknown
      }
    }
  }

  if (typeof value.custom_id === "string" && value.custom_id.trim()) {
    return value.custom_id.trim()
  }

  if (typeof value.invoice_id === "string" && value.invoice_id.trim()) {
    return value.invoice_id.trim()
  }

  return null
}

async function paypalRequest<T>(
  path: string,
  input: {
    method: "GET" | "POST"
    body?: unknown
    requestId?: string
  }
): Promise<T> {
  const config = getPayPalConfig()
  const token = await getPayPalAccessToken(config)
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  }

  if (input.requestId) {
    headers["PayPal-Request-Id"] = input.requestId
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: input.method,
    headers,
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(toPayPalErrorMessage(payload, response.status))
  }

  return payload as T
}

async function getPayPalAccessToken(config: PayPalConfig) {
  const now = Date.now()

  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 30_000) {
    return cachedAccessToken.token
  }

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString(
    "base64"
  )
  const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
      "Accept-Language": "en_US",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })
  const payload = (await response.json()) as {
    access_token?: string
    expires_in?: number
  }

  if (!response.ok || !payload.access_token) {
    throw new Error(toPayPalErrorMessage(payload, response.status))
  }

  cachedAccessToken = {
    token: payload.access_token,
    expiresAt: now + (payload.expires_in ?? 300) * 1000,
  }

  return cachedAccessToken.token
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required PayPal env var: ${name}`)
  }

  return value
}

function toPayPalEnvironment(value: string | undefined): PayPalEnvironment {
  if (value?.trim() === "live") {
    return "live"
  }

  return "sandbox"
}

function toPayPalErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const maybeMessage = (payload as { message?: unknown }).message

    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return `PayPal request failed (${status}): ${maybeMessage}`
    }
  }

  return `PayPal request failed (${status}).`
}

export function resetPayPalClientForTests() {
  cachedConfig = null
  cachedAccessToken = null
}
