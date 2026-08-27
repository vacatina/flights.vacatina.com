"use client"

import { useMemo, useState } from "react"
import { CheckIcon, ChevronsUpDownIcon, Globe2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  visaCountries,
  type VisaCountry,
} from "@/modules/visa-assistance/domain"

interface CountrySearchFieldProps {
  value?: string
  onChange: (countryCode: string) => void
  placeholder: string
  disabled?: boolean
  invalid?: boolean
  appearance?: "default" | "hero"
}

export function CountrySearchField({
  value,
  onChange,
  placeholder,
  disabled = false,
  invalid = false,
  appearance = "default",
}: CountrySearchFieldProps) {
  const [open, setOpen] = useState(false)
  const selectedCountry = useMemo(
    () => visaCountries.find((country) => country.code === value),
    [value]
  )

  function selectCountry(country: VisaCountry) {
    onChange(country.code)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            disabled={disabled}
            className={cn(
              "h-16 w-full justify-between px-5 text-left font-normal",
              appearance === "hero" &&
                "h-16 rounded-xl border-transparent bg-muted/70 px-5 text-base font-medium text-foreground shadow-none hover:bg-muted focus-visible:border-primary/20 focus-visible:ring-primary/10 aria-expanded:bg-muted"
            )}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-3">
          {selectedCountry ? (
            <span className="text-2xl leading-none" aria-hidden="true">
              {selectedCountry.emoji}
            </span>
          ) : appearance === "default" ? (
            <Globe2Icon data-icon="inline-start" />
          ) : null}
          <span
            className={cn(
              "truncate",
              !selectedCountry && "text-muted-foreground"
            )}
          >
            {selectedCountry?.name ?? placeholder}
          </span>
        </span>
        <ChevronsUpDownIcon
          className={cn(appearance === "hero" && "text-muted-foreground")}
          data-icon="inline-end"
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-(--anchor-width) min-w-72 p-0"
      >
        <Command>
          <CommandInput placeholder="Search by country name or code..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {visaCountries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  data-checked={country.code === value}
                  onSelect={() => selectCountry(country)}
                >
                  <span className="text-lg leading-none" aria-hidden="true">
                    {country.emoji}
                  </span>
                  <span className="truncate">{country.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground group-data-[checked=true]/command-item:mr-6">
                    {country.code}
                  </span>
                  <CheckIcon className="sr-only" />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
