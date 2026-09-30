"use client"

import { useEffect, useMemo, useRef, useState, type Ref } from "react"
import { ChevronsUpDownIcon, Globe2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
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
  searchVisaCountries,
  visaCountries,
  type VisaCountry,
} from "@/modules/visa-assistance/domain"
import { CountryFlag } from "@/modules/visa-assistance/ui/country-flag"

interface CountrySearchFieldProps {
  id?: string
  buttonRef?: Ref<HTMLButtonElement>
  onBlur?: () => void
  value?: string
  onChange: (countryCode: string) => void
  placeholder: string
  disabled?: boolean
  invalid?: boolean
  appearance?: "default" | "hero"
}

export function CountrySearchField({
  id,
  buttonRef,
  onBlur,
  value,
  onChange,
  placeholder,
  disabled = false,
  invalid = false,
  appearance = "default",
}: CountrySearchFieldProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [activeCountryCode, setActiveCountryCode] = useState("")
  const listRef = useRef<HTMLDivElement>(null)
  const selectedCountry = useMemo(
    () => visaCountries.find((country) => country.code === value),
    [value]
  )
  const matchingCountries = useMemo(
    () => searchVisaCountries(visaCountries, search),
    [search]
  )

  useEffect(() => {
    if (!open) return

    listRef.current?.scrollTo({ top: 0 })
  }, [open, search])

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen) {
      setSearch("")
      setActiveCountryCode(visaCountries[0]?.code ?? "")
    }
  }

  function selectCountry(country: VisaCountry) {
    onChange(country.code)
    setOpen(false)
    setSearch("")
  }

  function changeSearch(nextSearch: string) {
    const nextMatchingCountries = searchVisaCountries(visaCountries, nextSearch)

    setSearch(nextSearch)
    setActiveCountryCode(nextMatchingCountries[0]?.code ?? "")
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            ref={buttonRef}
            onBlur={onBlur}
            type="button"
            variant="outline"
            role="combobox"
            aria-label={placeholder}
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
            <CountryFlag
              src={selectedCountry.flagSrc}
              className="h-[18px] w-7"
            />
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
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180",
            appearance === "hero" && "text-muted-foreground"
          )}
          data-icon="inline-end"
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-(--anchor-width) min-w-72 overflow-hidden rounded-xl p-0 shadow-xl ring-1 shadow-slate-950/10 ring-foreground/10"
      >
        <Command
          value={activeCountryCode}
          onValueChange={setActiveCountryCode}
          shouldFilter={false}
          loop
          label={placeholder}
          className="p-0"
        >
          <div className="border-b border-border/70 p-2">
            <CommandInput
              value={search}
              onValueChange={changeSearch}
              placeholder="Search country or code"
              autoFocus
              className="h-9"
            />
          </div>

          <CommandList
            ref={listRef}
            label="Countries"
            className="max-h-80 scroll-py-2 p-1.5"
          >
            {matchingCountries.length ? (
              <CommandGroup>
                {matchingCountries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={country.code}
                    data-checked={country.code === value}
                    onSelect={() => selectCountry(country)}
                    className="min-h-11 gap-3 rounded-lg px-3 py-2.5"
                  >
                    <CountryFlag src={country.flagSrc} />
                    <span className="min-w-0 flex-1 truncate">
                      {country.name}
                    </span>
                    <span className="text-xs font-medium tracking-[0.08em] text-muted-foreground group-data-[checked=true]/command-item:mr-6">
                      {country.code}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium">No country found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try a country name or its two-letter code.
                </p>
              </div>
            )}
          </CommandList>

          <div className="border-t border-border/70 px-4 py-2 text-[11px] text-muted-foreground">
            Use arrow keys to move, then press Enter to select
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
