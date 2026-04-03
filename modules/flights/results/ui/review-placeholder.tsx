import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ReviewPlaceholder({
  partialOfferRequestId,
  selectedOfferIds,
}: {
  partialOfferRequestId: string
  selectedOfferIds: string[]
}) {
  return (
    <main className="min-h-svh bg-muted/40 py-10">
      <div className="mx-auto w-full max-w-4xl px-4 md:px-8">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Review step placeholder</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <p>
              Next step for booking flow will be implemented here.
            </p>
            <p>
              Partial offer request: <code>{partialOfferRequestId}</code>
            </p>
            <p>
              Selected offers:{" "}
              {selectedOfferIds.length > 0 ? selectedOfferIds.join(", ") : "None"}
            </p>
            <div>
              <Button render={<Link href="/" />}>Start new search</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
