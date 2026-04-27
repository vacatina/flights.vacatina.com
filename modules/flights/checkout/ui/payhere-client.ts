"use client"

import type { PayHereStartPaymentPayload } from "@/modules/flights/payments/payhere"

interface PayHereGlobal {
  onCompleted: (orderId: string) => void
  onDismissed: () => void
  onError: (error: unknown) => void
  startPayment: (payment: PayHereStartPaymentPayload) => void
}

declare global {
  interface Window {
    payhere?: PayHereGlobal
  }
}

interface StartPayHerePaymentInput {
  payload: PayHereStartPaymentPayload
  onCompleted: (orderId: string) => void
  onDismissed: () => void
  onError: (error: unknown) => void
}

export async function ensurePayHereSdk(scriptUrl: string) {
  if (typeof window === "undefined") {
    throw new Error("PayHere SDK can only load in browser.")
  }

  if (window.payhere) {
    return window.payhere
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[data-payhere-sdk="true"]`
  )

  if (existingScript) {
    await waitForScriptLoad(existingScript)
    if (!window.payhere) {
      throw new Error("PayHere SDK failed to initialize.")
    }
    return window.payhere
  }

  const script = document.createElement("script")
  script.src = scriptUrl
  script.async = true
  script.dataset.payhereSdk = "true"
  document.head.appendChild(script)
  await waitForScriptLoad(script)

  if (!window.payhere) {
    throw new Error("PayHere SDK failed to initialize.")
  }

  return window.payhere
}

export function startPayHerePayment(input: StartPayHerePaymentInput) {
  if (!window.payhere) {
    throw new Error("PayHere SDK is unavailable right now. Please try again.")
  }

  window.payhere.onCompleted = input.onCompleted
  window.payhere.onDismissed = input.onDismissed
  window.payhere.onError = input.onError
  window.payhere.startPayment(input.payload)
}

function waitForScriptLoad(script: HTMLScriptElement) {
  return new Promise<void>((resolve, reject) => {
    if (script.dataset.loaded === "true") {
      resolve()
      return
    }

    const onLoad = () => {
      script.dataset.loaded = "true"
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error("Failed to load PayHere SDK script."))
    }
    const cleanup = () => {
      script.removeEventListener("load", onLoad)
      script.removeEventListener("error", onError)
    }

    script.addEventListener("load", onLoad)
    script.addEventListener("error", onError)
  })
}

