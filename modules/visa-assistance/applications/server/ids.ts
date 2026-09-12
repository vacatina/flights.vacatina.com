import { randomUUID } from "node:crypto"

function compactUuid() {
  return randomUUID().replaceAll("-", "")
}

export function createVisaApplicationId() {
  return `vap_${compactUuid()}`
}

export function createVisaTravelerId() {
  return `vtr_${compactUuid()}`
}

export function createVisaDocumentId() {
  return `vdc_${compactUuid()}`
}

export function createVisaApplicationEventId() {
  return `vae_${compactUuid()}`
}

export function createVisaApplicationReference() {
  return `VISA-${compactUuid().slice(0, 8).toUpperCase()}`
}
