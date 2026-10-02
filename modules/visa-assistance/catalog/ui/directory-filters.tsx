"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { visaListingDirectoryHref } from "@/modules/visa-assistance/catalog/domain/list-query"

export function VisaListingDirectoryFilters({
  search: initialSearch,
  status: initialStatus,
}: {
  search: string
  status?: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus ?? "all")
  const [pending, startTransition] = useTransition()
  const navigate = (nextSearch: string, nextStatus: string) =>
    startTransition(() => {
      router.push(
        visaListingDirectoryHref({ search: nextSearch, status: nextStatus })
      )
    })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        navigate(search, status)
      }}
      aria-busy={pending}
    >
      <FieldGroup className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <Field>
          <FieldLabel htmlFor="listing-search">Find a visa listing</FieldLabel>
          <Input
            id="listing-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search country, visa name, or code"
            maxLength={120}
            disabled={pending}
          />
        </Field>
        <Field>
          <FieldLabel id="listing-status-label">Status</FieldLabel>
          <ToggleGroup
            variant="outline"
            value={[status]}
            disabled={pending}
            aria-labelledby="listing-status-label"
            onValueChange={(values) => {
              if (values[0]) setStatus(values[0])
            }}
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="draft">Draft</ToggleGroupItem>
            <ToggleGroupItem value="published">Published</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <div className="flex items-center gap-2">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SearchIcon data-icon="inline-start" />
            )}
            {pending ? "Searching…" : "Search"}
          </Button>
          {initialSearch || initialStatus ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setSearch("")
                setStatus("all")
                navigate("", "all")
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  )
}
