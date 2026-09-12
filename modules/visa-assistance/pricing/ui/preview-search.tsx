"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { CountrySearchField } from "@/modules/visa-assistance/ui/country-search-field"

export function VisaPricingPreviewSearch({
  initialNationality = "",
  initialDestination = "",
}: {
  initialNationality?: string
  initialDestination?: string
}) {
  const [nationality, setNationality] = useState(initialNationality)
  const [destination, setDestination] = useState(initialDestination)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const invalidSelection =
    !nationality || !destination || nationality === destination

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (invalidSelection || isPending) return

    const query = new URLSearchParams({ nationality, destination })
    startTransition(() => {
      router.push(`/admin/visa-pricing?${query.toString()}`)
    })
  }

  return (
    <form
      method="get"
      className="flex flex-col gap-5"
      onSubmit={handleSubmit}
      aria-busy={isPending}
    >
      <input type="hidden" name="nationality" value={nationality} />
      <input type="hidden" name="destination" value={destination} />
      <FieldGroup className="grid gap-5 md:grid-cols-2">
        <Field>
          <FieldLabel>Passport country</FieldLabel>
          <CountrySearchField
            value={nationality}
            onChange={setNationality}
            placeholder="Select passport country"
            disabled={isPending}
          />
        </Field>
        <Field>
          <FieldLabel>Destination country</FieldLabel>
          <CountrySearchField
            value={destination}
            onChange={setDestination}
            placeholder="Select destination"
            disabled={isPending}
          />
        </Field>
      </FieldGroup>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={invalidSelection || isPending}
          aria-busy={isPending}
        >
          {isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SearchIcon data-icon="inline-start" />
          )}
          {isPending ? "Loading current prices..." : "Preview live pricing"}
        </Button>
      </div>
    </form>
  )
}
