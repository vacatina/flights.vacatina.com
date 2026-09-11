import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function VisaPricingAdminLoadingState() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading visa pricing">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} size="sm">
            <CardHeader className="gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-12" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="mt-5 flex justify-end">
            <Skeleton className="h-10 w-44" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 7 }, (_, index) => (
                  <TableHead key={index}>
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }, (_, row) => (
                <TableRow key={row}>
                  {Array.from({ length: 7 }, (_, column) => (
                    <TableCell key={column}>
                      <Skeleton className="h-4 w-full min-w-14" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
