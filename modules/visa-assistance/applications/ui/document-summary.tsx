import { Badge } from "@/components/ui/badge"
import { getDocumentSlots, type VisaApplicationDetail } from "../domain"

export function VisaDocumentSummary({
  detail,
}: {
  detail: VisaApplicationDetail
}) {
  const slots = getDocumentSlots(detail)
  if (!slots.length)
    return (
      <p className="text-sm text-muted-foreground">
        No documents required at this stage.
      </p>
    )
  return (
    <ul className="flex flex-col gap-3">
      {slots.map((slot) => {
        const document = detail.documents.find(
          (doc) =>
            doc.status === "uploaded" &&
            doc.applicationId === detail.application.id &&
            doc.requirementId === slot.requirement.id &&
            doc.travelerId === slot.travelerId
        )
        return (
          <li
            key={slot.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div>
              <p className="text-sm font-medium">{slot.requirement.label}</p>
              <p className="text-xs text-muted-foreground">
                {slot.travelerLabel}
              </p>
              {document ? (
                <a
                  className="mt-1 block text-sm text-primary hover:underline"
                  href={`/api/visa-applications/${detail.application.id}/documents/${document.id}`}
                >
                  {document.originalFilename}
                </a>
              ) : null}
            </div>
            <Badge variant={document ? "secondary" : "outline"}>
              {document
                ? "Uploaded"
                : slot.requirement.required
                  ? "Required · missing"
                  : "Optional"}
            </Badge>
          </li>
        )
      })}
    </ul>
  )
}
