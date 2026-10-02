import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

export default function VisaListingNotFound() {
  return (
    <main className="w-full mx-auto max-w-screen-2xl px-4 py-20">
      <Empty className="rounded-xl border">
        <EmptyHeader>
          <EmptyTitle>This visa service is not available</EmptyTitle>
          <EmptyDescription>
            The service may no longer be offered for this route. Search again to
            see our currently available services.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            role="link"
            size="lg"
            nativeButton={false}
            render={<Link href="/visa-assistance" />}
          >
            Search visa services
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
