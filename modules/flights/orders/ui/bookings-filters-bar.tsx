"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type {
  BookingListSort,
  BookingListStatusFilter,
} from "@/modules/flights/orders/domain"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BookingsFiltersBarProps {
  q?: string
  status: BookingListStatusFilter
  sort: BookingListSort
}

export function BookingsFiltersBar({
  q,
  status,
  sort,
}: BookingsFiltersBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [queryDraft, setQueryDraft] = useState(q ?? "")

  const replaceWithPatch = useCallback(
    (patch: Partial<{ q: string; status: BookingListStatusFilter; sort: BookingListSort }>) => {
      const params = new URLSearchParams(searchParams.toString())

      if (patch.q !== undefined) {
        const nextQ = patch.q.trim()
        if (nextQ.length > 0) {
          params.set("q", nextQ)
        } else {
          params.delete("q")
        }
      }

      if (patch.status !== undefined) {
        params.set("status", patch.status)
      }

      if (patch.sort !== undefined) {
        params.set("sort", patch.sort)
      }

      params.set("page", "1")
      const nextQuery = params.toString()
      const currentQuery = searchParams.toString()

      if (nextQuery === currentQuery) {
        return
      }

      router.replace(nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      })
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const currentQ = q ?? ""
      if (queryDraft.trim() === currentQ.trim()) {
        return
      }

      replaceWithPatch({ q: queryDraft })
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [q, queryDraft, replaceWithPatch])

  const hasActiveFilters = useMemo(
    () => Boolean((q ?? "").trim()) || status !== "all" || sort !== "newest",
    [q, sort, status]
  )

  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-label="Bookings filters"
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto] md:items-center">
        <div className="space-y-1">
          <label htmlFor="bookings-search" className="text-sm text-muted-foreground">
            Search booking reference
          </label>
          <Input
            id="bookings-search"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="e.g. BK-F60F36ABAD"
            className="h-10 text-base md:text-base"
            autoComplete="off"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="bookings-status" className="text-sm text-muted-foreground">
            Status
          </label>
          <Select
            value={status}
            onValueChange={(value) =>
              replaceWithPatch({
                status: value as BookingListStatusFilter,
                q: queryDraft,
              })
            }
          >
            <SelectTrigger id="bookings-status" className="h-10 w-full text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="payment_pending">Payment pending</SelectItem>
              <SelectItem value="on_hold">On hold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label htmlFor="bookings-sort" className="text-sm text-muted-foreground">
            Sort by
          </label>
          <Select
            value={sort}
            onValueChange={(value) =>
              replaceWithPatch({ sort: value as BookingListSort, q: queryDraft })
            }
          >
            <SelectTrigger id="bookings-sort" className="h-10 w-full text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="amount_high">Amount high to low</SelectItem>
              <SelectItem value="amount_low">Amount low to high</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:pt-6">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full text-base"
            disabled={!hasActiveFilters}
            onClick={() => {
              setQueryDraft("")
              router.replace(pathname, { scroll: false })
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>
    </section>
  )
}
