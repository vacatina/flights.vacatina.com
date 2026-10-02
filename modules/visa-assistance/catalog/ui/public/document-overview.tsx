import { visaPanel } from "./visa-surfaces"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { PublicVisaDocument } from "../../domain/public-listing"

export function DocumentOverview({
  documents,
}: {
  documents: PublicVisaDocument[]
}) {
  return (
    <Card className={visaPanel}>
      <CardHeader>
        <CardTitle>
          <h2>Documents to prepare</h2>
        </CardTitle>
        <CardDescription>
          Review this checklist before requesting assistance. Don’t email
          identity documents; our team will explain how to share them securely.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length ? (
          <ul className="flex flex-col gap-6">
            {documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-col gap-2 rounded-2xl border border-primary/10 bg-primary/[0.035] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium [overflow-wrap:anywhere]">
                    {document.label}
                  </h3>
                  <Badge variant={document.required ? "secondary" : "outline"}>
                    {document.required ? "Required" : "Optional"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {document.scope === "per_traveler"
                    ? "For each traveler"
                    : "Once per request, shared by all travelers"}
                </p>
                {document.instructions ? (
                  <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-line">
                    {document.instructions}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No document uploads are listed for this service. Our team will
            confirm whether any further information is needed.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
