import { z } from "zod"

export const payHereStartPaymentSchema = z.object({
  sandbox: z.boolean(),
  merchant_id: z.string().trim().min(1),
  return_url: z.string().trim().url(),
  cancel_url: z.string().trim().url(),
  notify_url: z.string().trim().url(),
  order_id: z.string().trim().min(1).max(64),
  items: z.string().trim().min(1).max(255),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.literal("LKR"),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.email(),
  phone: z.string().trim().min(7).max(20),
  address: z.string().trim().min(3).max(255),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  custom_1: z.string().trim().max(255).optional(),
  custom_2: z.string().trim().max(255).optional(),
  hash: z.string().trim().min(32).max(64),
})

export const payHereNotifySchema = z.object({
  merchant_id: z.string().trim().min(1),
  order_id: z.string().trim().min(1),
  payment_id: z.string().trim().min(1),
  payhere_amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  payhere_currency: z.string().trim().min(1).max(8),
  status_code: z.string().trim().min(1).max(8),
  md5sig: z.string().trim().min(1),
  method: z.string().trim().optional(),
  status_message: z.string().trim().optional(),
  card_holder_name: z.string().trim().optional(),
  card_no: z.string().trim().optional(),
  card_expiry: z.string().trim().optional(),
  custom_1: z.string().trim().optional(),
  custom_2: z.string().trim().optional(),
})

export type PayHereStartPaymentSchemaValue = z.infer<
  typeof payHereStartPaymentSchema
>
export type PayHereNotifySchemaValue = z.infer<typeof payHereNotifySchema>

