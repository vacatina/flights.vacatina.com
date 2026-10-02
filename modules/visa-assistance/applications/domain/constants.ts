export const VISA_APPLICATION_MAX_TRAVELERS = 10
export const VISA_DOCUMENT_MAX_FILE_SIZE = 10 * 1024 * 1024

export const VISA_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const

export const VISA_APPLICATION_STEPS = [
  "trip",
  "travelers",
  "contact",
  "documents",
  "review",
] as const
