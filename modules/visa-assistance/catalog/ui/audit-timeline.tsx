import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { VisaListingAuditEvent } from "@/modules/visa-assistance/catalog/server/admin-queries"
import { formatListingDate } from "./format-date"

const labels = {
  created: "Created",
  updated: "Updated",
  published: "Published",
  unpublished: "Unpublished",
}

export function VisaListingAuditTimeline({
  events,
}: {
  events: VisaListingAuditEvent[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Who changed this listing and when.</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length ? (
          <ol className="flex flex-col gap-4">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="font-medium">{labels[event.eventType]}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.actorEmail ?? "Admin account unavailable"}
                  </p>
                </div>
                <time
                  dateTime={event.createdAt.toISOString()}
                  className="text-sm text-muted-foreground"
                >
                  {formatListingDate(event.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            Activity will appear after the next change.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
