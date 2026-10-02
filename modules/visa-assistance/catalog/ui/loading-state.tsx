import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function VisaCatalogLoading({ editor = false }: { editor?: boolean }) {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-label={editor ? "Loading visa editor" : "Loading visa listings"}
    >
      <span className="sr-only">
        {editor ? "Loading visa editor…" : "Loading visa listings…"}
      </span>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">
            {Array.from({ length: editor ? 4 : 6 }, (_, index) => (
              <Skeleton
                key={index}
                className={cn("w-full", editor ? "h-20" : "h-10")}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
