import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FlowPageErrorStateProps {
  title: string
  message: string
  backHref: string
  backLabel: string
}

export function FlowPageErrorState({
  title,
  message,
  backHref,
  backLabel,
}: FlowPageErrorStateProps) {
  return (
    <main className="min-h-svh bg-muted/40 py-10">
      <div className="mx-auto w-full max-w-screen-2xl px-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground">{message}</p>
            <Button className="w-fit" render={<Link href={backHref} />}>
              {backLabel}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

