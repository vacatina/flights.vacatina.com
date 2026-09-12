import Link from "next/link"
import { FileQuestionIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function VisaRequestNotFound() {
  return (
    <main className="flex min-h-[60svh] items-center justify-center px-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestionIcon />
          </EmptyMedia>
          <EmptyTitle>Visa request not found</EmptyTitle>
          <EmptyDescription>
            This request may not exist or may belong to another account.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/visa-requests" />}
          >
            Back to visa requests
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
