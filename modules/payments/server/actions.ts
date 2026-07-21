"use server"

import { paymentProductAdapterRequired } from "@/modules/payments/server/service"

export async function startPayPalPaymentAction(): Promise<never> {
  paymentProductAdapterRequired()
}

export async function capturePayPalPaymentAction(): Promise<never> {
  paymentProductAdapterRequired()
}

export async function getPaymentStatusAction(): Promise<never> {
  paymentProductAdapterRequired()
}
