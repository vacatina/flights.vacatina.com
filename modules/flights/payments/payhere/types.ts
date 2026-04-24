export interface PayHereStartPaymentPayload {
  sandbox: boolean
  merchant_id: string
  return_url: string
  cancel_url: string
  notify_url: string
  order_id: string
  items: string
  amount: string
  currency: "LKR"
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  custom_1?: string
  custom_2?: string
  hash: string
}

export interface PayHereNotifyPayload {
  merchant_id: string
  order_id: string
  payment_id: string
  payhere_amount: string
  payhere_currency: string
  status_code: string
  md5sig: string
  method?: string
  status_message?: string
  card_holder_name?: string
  card_no?: string
  card_expiry?: string
  custom_1?: string
  custom_2?: string
}

export type PayHereMappedStatus =
  | "success"
  | "failed"
  | "cancelled"
  | "pending"

export interface PayHereConvertedAmount {
  sourceCurrency: string
  targetCurrency: "LKR"
  sourceAmount: number
  convertedAmount: number
  baseRate: number
  bufferPercent: number
  effectiveRate: number
}
