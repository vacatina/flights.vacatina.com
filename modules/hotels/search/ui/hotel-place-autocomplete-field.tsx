"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import type { Control } from "react-hook-form"
import { useController } from "react-hook-form"
import { LoaderCircleIcon, MapPinIcon } from "lucide-react"

import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { searchHotelDestinations, type HotelPlaceSuggestion } from "@/modules/hotels/search/server/places"
import type { HotelSearchFormValues } from "@/modules/hotels/search/domain"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"
import { cn } from "@/lib/utils"
import { createPortal } from "react-dom"

interface HotelPlaceAutocompleteFieldProps {
  control: Control<HotelSearchFormValues>
  name: "placeId"
  label: string
  placeholder: string
  disabled?: boolean
  fieldClassName?: string
  labelClassName?: string
  inputClassName?: string
  onSelectName?: (name: string) => void
}

export function HotelPlaceAutocompleteField({
  control,
  name,
  label,
  placeholder,
  disabled = false,
  fieldClassName,
  labelClassName,
  inputClassName,
  onSelectName,
}: HotelPlaceAutocompleteFieldProps) {
  const { field, fieldState } = useController({ control, name })

  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [options, setOptions] = useState<HotelPlaceSuggestion[]>([])
  
  // We need to visually display the text the user types, while storing the placeId in the form field.
  const [inputValue, setInputValue] = useState("")

  const inputRef = useRef<HTMLInputElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!open || disabled || !inputRef.current) return
    const updateRect = () => {
      if (inputRef.current) {
        setRect(inputRef.current.getBoundingClientRect())
      }
    }
    updateRect()
    window.addEventListener("scroll", updateRect, true)
    window.addEventListener("resize", updateRect)
    return () => {
      window.removeEventListener("scroll", updateRect, true)
      window.removeEventListener("resize", updateRect)
    }
  }, [open, disabled])

  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!open || disabled) {
      return
    }

    const trimmed = inputValue.trim()

    if (trimmed.length < 2) {
      return
    }

    const activeRequest = requestIdRef.current + 1
    requestIdRef.current = activeRequest

    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const result = await searchHotelDestinations(trimmed)

        if (requestIdRef.current !== activeRequest) {
          return
        }

        if (!result.ok) {
          setOptions([])
          setSearchError(
            toSafeUserErrorMessage(
              result.error.message,
              "Unable to search places right now. Please try again."
            )
          )
          return
        }

        setOptions(result.data)
        setSearchError(null)
      })
    }, 300)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [disabled, open, inputValue])

  function handleSelect(option: HotelPlaceSuggestion) {
    // Store the ID in the form state
    field.onChange(option.placeId)
    // Show the visual name to the user
    setInputValue(option.displayName)
    if (onSelectName) {
      onSelectName(option.displayName)
    }
    setOpen(false)
    setSearchError(null)
  }

  function handleInputBlur() {
    setTimeout(() => setOpen(false), 200)
    // If they blur without selecting a valid option, and the ID isn't set, we clear the visual text
    if (!field.value) {
      setInputValue("")
    }
  }

  function handleInputChange(value: string) {
    setInputValue(value)
    // They started typing again, clear the old selected ID so validation fails if they don't pick one
    field.onChange("")
    setOpen(true)
    const trimmed = value.trim()

    if (trimmed.length < 2) {
      setOptions([])
      setSearchError(null)
    }
  }

  return (
    <Field
      data-invalid={fieldState.invalid || undefined}
      className={fieldClassName}
    >
      <FieldLabel className={cn("text-sm font-medium", labelClassName)}>
        {label}
      </FieldLabel>
      <div className="relative flex flex-col">
        <Input
          ref={inputRef}
          value={inputValue}
          onFocus={() => {
            setOpen(true)
          }}
          onBlur={handleInputBlur}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={fieldState.invalid || undefined}
          className={cn(
            "h-14 rounded-xl border-input bg-background px-5 text-base font-medium text-foreground placeholder:text-muted-foreground md:text-base",
            inputClassName
          )}
        />
        {fieldState.error?.message && (
          <p className="mt-2 text-sm font-medium text-destructive">{fieldState.error.message}</p>
        )}

        {open && !disabled && rect && typeof document !== "undefined" && createPortal(
          <div 
            className="fixed z-50 w-full overflow-hidden rounded-xl border bg-popover shadow-md"
            style={{
              top: rect.bottom + 6,
              left: rect.left,
              width: rect.width,
            }}
          >
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

                {!isPending && !searchError && options.length === 0 && inputValue.trim().length >= 2 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No places found.</p>
                )}

                {options.length > 0 && (
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.placeId}
                        value={option.placeId}
                        onMouseDown={(event) => {
                          event.preventDefault()
                          handleSelect(option)
                        }}
                        className="py-2 cursor-pointer"
                      >
                        <MapPinIcon className="mr-2 h-4 w-4" />
                        <span className="flex flex-col">
                          <span className="font-medium">{option.displayName}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.formattedAddress}
                          </span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>,
          document.body
        )}
      </div>
    </Field>
  )
}
