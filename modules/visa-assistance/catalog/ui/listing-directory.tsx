import { FilesIcon, PlusIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AdminLinkButton } from "@/modules/admin/ui/admin-link-button"
import { formatSerializedMoney } from "@/modules/currency/domain/money"
import { getListingEstimate } from "@/modules/visa-assistance/catalog/domain/money"
import { visaListingDirectoryHref } from "@/modules/visa-assistance/catalog/domain/list-query"
import type { AdminVisaListingPage } from "@/modules/visa-assistance/catalog/server/admin-queries"
import { ListingCountryLabel } from "./country-label"
import { VisaListingDirectoryFilters } from "./directory-filters"
import { formatListingDate } from "./format-date"
import { UnpublishListingButton } from "./unpublish-button"

export function VisaListingDirectory({
  result,
  search,
  status,
}: {
  result: AdminVisaListingPage
  search: string
  status?: string
}) {
  const paginationHref = (page: number) =>
    visaListingDirectoryHref({ search, status, page })
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Visa catalog</CardTitle>
          <CardDescription>
            Create the routes and visa types Vacatina offers. Drafts are visible
            only to admins.
          </CardDescription>
          <CardAction>
            <AdminLinkButton
              href="/admin/visa-listings/new"
              size="lg"
              pendingLabel="Opening editor…"
            >
              <PlusIcon data-icon="inline-start" />
              Create listing
            </AdminLinkButton>
          </CardAction>
        </CardHeader>
        <CardContent>
          <VisaListingDirectoryFilters
            key={`${search}:${status ?? "all"}`}
            search={search}
            status={status}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {result.total}{" "}
            {result.total === 1 ? "visa listing" : "visa listings"}
          </CardTitle>
          <CardDescription>
            {search || status
              ? "Matching your current filters."
              : "Manage your customer estimates and required documents."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.rows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Passport country</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Visa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estimate / traveler</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Updated / reviewed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map(
                  ({ listing, documentCount, updatedByEmail }) => {
                    const estimate = getListingEstimate(listing)
                    return (
                      <TableRow key={listing.id}>
                        <TableCell>
                          <ListingCountryLabel code={listing.nationalityCode} />
                        </TableCell>
                        <TableCell>
                          <ListingCountryLabel code={listing.destinationCode} />
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">
                            {listing.title || "Untitled draft"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {listing.code}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              listing.status === "published"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {listing.status === "published"
                              ? "Published"
                              : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {estimate
                            ? formatSerializedMoney(estimate)
                            : "Not entered"}
                        </TableCell>
                        <TableCell>{documentCount}</TableCell>
                        <TableCell>
                          <p>{formatListingDate(listing.updatedAt)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Reviewed: {formatListingDate(listing.reviewedAt)}
                          </p>
                          {updatedByEmail ? (
                            <p
                              className="mt-1 max-w-44 truncate text-xs text-muted-foreground"
                              title={updatedByEmail}
                            >
                              {updatedByEmail}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <AdminLinkButton
                              href={`/admin/visa-listings/${listing.id}`}
                              variant="outline"
                              size="sm"
                            >
                              Edit
                            </AdminLinkButton>
                            <AdminLinkButton
                              href={`/admin/visa-listings/new?duplicate=${listing.id}`}
                              variant="ghost"
                              size="sm"
                            >
                              Duplicate
                            </AdminLinkButton>
                            {listing.status === "published" ? (
                              <UnpublishListingButton id={listing.id} />
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  }
                )}
              </TableBody>
            </Table>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FilesIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {search || status
                    ? "No matching visa listings"
                    : "Create your first visa listing"}
                </EmptyTitle>
                <EmptyDescription>
                  {search || status
                    ? "Try another country or visa name, or clear the filters."
                    : "Start with one passport country and destination. Add descriptions, fees, and the document checklist."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <AdminLinkButton
                  href={
                    search || status
                      ? "/admin/visa-listings"
                      : "/admin/visa-listings/new"
                  }
                  size="lg"
                >
                  {search || status ? "Clear filters" : "Create listing"}
                </AdminLinkButton>
              </EmptyContent>
            </Empty>
          )}
        </CardContent>
        {result.totalPages > 1 ? (
          <CardFooter className="flex-wrap justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page {result.page} of {result.totalPages}
            </p>
            <div className="flex gap-2">
              {result.page > 1 ? (
                <AdminLinkButton
                  href={paginationHref(result.page - 1)}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </AdminLinkButton>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
              )}
              {result.page < result.totalPages ? (
                <AdminLinkButton
                  href={paginationHref(result.page + 1)}
                  variant="outline"
                  size="sm"
                >
                  Next
                </AdminLinkButton>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              )}
            </div>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  )
}
