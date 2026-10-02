import { z } from "zod"

import {
  VISA_DOCUMENT_MAX_FILE_SIZE,
  VISA_DOCUMENT_MIME_TYPES,
} from "@/modules/visa-assistance/applications/domain/constants"

export const documentMetadataSchema = z.object({
  applicationId: z.string().trim().min(1),
  travelerId: z.string().trim().min(1).nullable().default(null),
  requirementId: z.uuid(),
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.enum(VISA_DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(VISA_DOCUMENT_MAX_FILE_SIZE),
})

export const completeDocumentUploadSchema = z.object({
  applicationId: z.string().trim().min(1),
  documentId: z.string().trim().min(1),
})

export type VisaDocumentMetadata = z.input<typeof documentMetadataSchema>
