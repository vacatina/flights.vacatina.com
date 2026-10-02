import "server-only"
import { eq } from "drizzle-orm"
import { visaApplicationDocuments } from "@/lib/db/schema"
import { requireDb, type VisaExecutor } from "./application-database"
export async function createVisaApplicationDocument(
  document: typeof visaApplicationDocuments.$inferInsert,
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()
  const [created] = await db
    .insert(visaApplicationDocuments)
    .values(document)
    .returning()
  return created
}

export async function findVisaApplicationDocument(
  documentId: string,
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()
  return db.query.visaApplicationDocuments.findFirst({
    where: eq(visaApplicationDocuments.id, documentId),
  })
}

export async function updateVisaApplicationDocument(
  documentId: string,
  values: Partial<typeof visaApplicationDocuments.$inferInsert>,
  executor?: VisaExecutor
) {
  const db = executor ?? requireDb()
  const [updated] = await db
    .update(visaApplicationDocuments)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(visaApplicationDocuments.id, documentId))
    .returning()
  return updated ?? null
}
