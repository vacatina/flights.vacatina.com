"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import type { Control } from "react-hook-form"
import { useController } from "react-hook-form"
import { CheckIcon, LoaderCircleIcon, MapPinIcon } from "lucide-react"

import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import type {
  FlightSearchFormValues,
  PlaceSuggestionOption,
} from "@/modules/flights/search/domain"
import { searchPlacesAction } from "@/modules/flights/search/server/actions"
import { logFlightFlow } from "@/modules/flights/shared/flow-debug"

interface PlaceAutocompleteFieldProps {
  control: Control<FlightSearchFormValues>
  name: `slices.${number}.origin` | `slices.${number}.destination`
  label: string
  placeholder: string
  disabled?: boolean
}

export function PlaceAutocompleteField({
  control,
  name,
  label,
  placeholder,
  disabled = false,
}: PlaceAutocompleteFieldProps) {
  const { field, fieldState } = useController({ control, name })

  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [options, setOptions] = useState<PlaceSuggestionOption[]>([])

  const requestIdRef = useRef(0)
  const selectedDisplayName = field.value?.displayName ?? ""
  const inputValue = open ? query : selectedDisplayName

  useEffect(() => {
    if (!open || disabled) {
      return
    }

    const trimmed = query.trim()

    if (trimmed.length < 2) {
      return
    }

    const activeRequest = requestIdRef.current + 1
    requestIdRef.current = activeRequest
    logFlightFlow("placeAutocompleteField", "search_debounced", {
      field: name,
      queryLength: trimmed.length,
      activeRequest,
    })

    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        logFlightFlow("placeAutocompleteField", "search_request_started", {
          field: name,
          queryLength: trimmed.length,
          activeRequest,
        })
        const result = await searchPlacesAction({
          query: trimmed,
        })

        if (requestIdRef.current !== activeRequest) {
          logFlightFlow("placeAutocompleteField", "search_response_ignored_stale", {
            field: name,
            queryLength: trimmed.length,
            activeRequest,
            latestRequest: requestIdRef.current,
          })
          return
        }

        if (!result.ok) {
          logFlightFlow("placeAutocompleteField", "search_request_failed", {
            field: name,
            queryLength: trimmed.length,
            activeRequest,
            code: result.error.code,
          })
          setOptions([])
          setSearchError(result.error.message)
          return
        }

        logFlightFlow("placeAutocompleteField", "search_request_succeeded", {
          field: name,
          queryLength: trimmed.length,
          activeRequest,
          optionCount: result.data.length,
        })
        setOptions(result.data)
        setSearchError(null)
      })
    }, 300)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [disabled, name, open, query])

  function handleSelect(option: PlaceSuggestionOption) {
    logFlightFlow("placeAutocompleteField", "option_selected", {
      field: name,
      optionId: option.id,
      optionType: option.type,
    })
    field.onChange(option)
    setQuery(option.displayName)
    setOpen(false)
    setSearchError(null)
  }

  function handleInputBlur() {
    logFlightFlow("placeAutocompleteField", "input_blurred", {
      field: name,
    })
    setOpen(false)
  }

  function handleInputChange(value: string) {
    logFlightFlow("placeAutocompleteField", "input_changed", {
      field: name,
      valueLength: value.length,
    })
    setQuery(value)
    setOpen(true)
    const trimmed = value.trim()

    if (trimmed.length < 2) {
      setOptions([])
      setSearchError(null)
    }

    if (field.value && value !== field.value.displayName) {
      logFlightFlow("placeAutocompleteField", "cleared_selected_value", {
        field: name,
        previousValueId: field.value.id,
      })
      field.onChange(null)
    }
  }

  return (
    <Field data-invalid={fieldState.invalid || undefined}>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative flex flex-col">
        <Input
          value={inputValue}
          onFocus={() => {
            logFlightFlow("placeAutocompleteField", "input_focused", {
              field: name,
            })
            setQuery(selectedDisplayName)
            setOpen(true)
          }}
          onBlur={handleInputBlur}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={fieldState.invalid || undefined}
          className="h-14 rounded-xl px-6 text-[1.8rem] font-medium md:text-base"
        />

        {open && !disabled && (
          <div className="absolute top-[calc(100%+6px)] z-40 w-full overflow-hidden rounded-xl border bg-popover shadow-md">
            <Command className="rounded-none bg-transparent p-0">
              <CommandList className="max-h-64">
                {isPending && (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <LoaderCircleIcon className="size-4 animate-spin" />
                    Searching places...
                  </div>
                )}

                {!isPending && searchError && (
                  <p className="px-3 py-2 text-sm text-destructive">{searchError}</p>
                )}

                {!isPending && !searchError && options.length === 0 && query.trim().length >= 2 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No places found.</p>
                )}

                {options.length > 0 && (
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.id}
                        value={option.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onSelect={() => handleSelect(option)}
                        className="py-2"
                      >
                        <MapPinIcon />
                        <span className="flex flex-col">
                          <span className="font-medium">{option.displayName}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.type === "city" ? "City" : "Airport"}
                          </span>
                        </span>
                        {field.value?.id === option.id && <CheckIcon className="ml-auto" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>
        )}
      </div>
      <FieldError>{fieldState.error?.message}</FieldError>
    </Field>
  )
}
