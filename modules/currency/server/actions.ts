"use server"

import { cookies } from "next/headers"

import {
  DISPLAY_CURRENCY_COOKIE_NAME,
  isDisplayCurrencyCode,
  type DisplayCurrencyCode,
} from "@/modules/currency/domain"

const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

export async function persistDisplayCurrency(
  currency: DisplayCurrencyCode
): Promise<void> {
  if (!isDisplayCurrencyCode(currency)) {
    throw new Error("Unsupported display currency.")
  }

  const cookieStore = await cookies()
  cookieStore.set(DISPLAY_CURRENCY_COOKIE_NAME, currency, {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}
