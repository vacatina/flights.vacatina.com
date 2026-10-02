import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { ListingTextField } from "./text-field"

const details = [
  {
    name: "processingTimeText",
    label: "Processing time",
    placeholder: "Usually 3–5 working days",
  },
  {
    name: "validityText",
    label: "Visa validity",
    placeholder: "Valid for 30 days from issue",
  },
  {
    name: "maxStayText",
    label: "Maximum stay",
    placeholder: "Up to 30 days per visit",
  },
  {
    name: "entriesText",
    label: "Number of entries",
    placeholder: "Single entry",
  },
  {
    name: "passportValidityText",
    label: "Passport validity",
    placeholder: "At least 6 months beyond arrival",
  },
] as const

export function ListingDetailsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visa details</CardTitle>
        <CardDescription>
          Describe the service and requirements. Optional details appear only
          when filled in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <ListingTextField
            name="fullDescription"
            label="Full description"
            multiline
            maxLength={10000}
            placeholder="Explain who this visa is for, what it covers, and how Vacatina assists the traveler."
            description="Plain text, up to 10,000 characters. Paragraphs are preserved."
          />
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            {details.map((detail) => (
              <ListingTextField key={detail.name} {...detail} />
            ))}
          </FieldGroup>
          <ListingTextField
            name="eligibilityNotes"
            label="Eligibility notes (optional)"
            multiline
            placeholder="Explain any residence, age, or travel-purpose restrictions."
          />
          <ListingTextField
            name="additionalNotes"
            label="Additional notes (optional)"
            multiline
            placeholder="Add any other information customers should know before requesting assistance."
          />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
