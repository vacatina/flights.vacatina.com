import { CheckCircle2Icon } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getListingPublishIssues,
  type VisaListingInput,
} from "@/modules/visa-assistance/catalog/domain/listing"
import { parseListingFee } from "@/modules/visa-assistance/catalog/domain/money"

export function listingFormPublishIssues(values: VisaListingInput) {
  const fee = (value: string | null | undefined) => {
    try {
      return parseListingFee(value, values.feeCurrency ?? null)
    } catch {
      return null
    }
  }
  const issues = getListingPublishIssues({
    title: values.title ?? "",
    shortSummary: values.shortSummary ?? "",
    fullDescription: values.fullDescription ?? "",
    feeCurrency: values.feeCurrency ?? null,
    governmentFeeMinor: fee(values.governmentFee),
    processingFeeMinor: fee(values.processingFee),
    documentsReviewed: values.documentsReviewed ?? false,
  })
  if (!values.nationalityCode) issues.unshift("Select a passport country")
  if (!values.destinationCode) issues.unshift("Select a destination")
  if (!values.code?.trim()) issues.unshift("Enter a visa code")
  if (values.documents.some((document) => !document.label?.trim()))
    issues.push("Name every document requirement")
  return issues
}

export function ListingPublishReadiness({ issues }: { issues: string[] }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          {issues.length ? "Before publishing" : "Ready to publish"}
        </CardTitle>
        <CardDescription>
          {issues.length
            ? "You can save an incomplete draft."
            : "Preview the customer details before publishing."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length ? (
          <ul className="flex list-disc flex-col gap-2 pl-4 text-sm text-muted-foreground">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2Icon className="size-4 text-primary" />
            All required details are complete.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
