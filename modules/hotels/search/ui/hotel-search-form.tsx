"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"

import { FieldGroup, Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { Separator } from "@/components/ui/separator"
import {
  hotelSearchFormSchema,
  type HotelSearchFormValues,
} from "@/modules/hotels/search/domain"
import { submitHotelSearchAction } from "@/modules/hotels/search/server/actions"
import { logHotelFlow } from "@/modules/hotels/shared/server/actions-logger"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"
import { cn } from "@/lib/utils"
import { HotelPlaceAutocompleteField } from "@/modules/hotels/search/ui/hotel-place-autocomplete-field"
import { HotelDatePickerField } from "@/modules/hotels/search/ui/hotel-date-picker-field"
import { HotelGuestInlineControls, PassengerStepper } from "@/modules/hotels/search/ui/hotel-guest-inline-controls"

interface HotelSearchFormProps {
  initialValues?: HotelSearchFormValues
}

export function HotelSearchForm({ initialValues }: HotelSearchFormProps) {
  const router = useRouter()
  const [isSubmitting, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [destinationName, setDestinationName] = useState("")

  const defaultValues = useMemo<Partial<HotelSearchFormValues>>(() => ({
    placeId: "",
    checkInDate: "",
    checkOutDate: "",
    guests: {
      adults: 2,
      children: 0,
      childrenAges: [],
    },
    rooms: 1,
  }), [])

  const form = useForm<HotelSearchFormValues>({
    resolver: zodResolver(hotelSearchFormSchema),
    defaultValues: initialValues ?? (defaultValues as HotelSearchFormValues),
    mode: "onSubmit",
  })

  const {
    clearErrors,
    control,
    handleSubmit,
    setError,
    formState: { errors },
    register,
  } = form

  const onSubmit = handleSubmit((values) => {
    logHotelFlow("hotelSearchForm", "submit_clicked", {
      placeId: values.placeId,
      adults: values.guests.adults,
      children: values.guests.children,
    })
    setServerError(null)
    clearErrors()

    startTransition(() => {
      void submitSearch(values)
    })
  })

  async function submitSearch(values: HotelSearchFormValues) {
    logHotelFlow("hotelSearchForm", "submit_started", {})
    const result = await submitHotelSearchAction(values)

    if (!result.ok) {
      let appliedCount = 0
      if (result.error.fieldErrors) {
        for (const [fieldPath, message] of Object.entries(result.error.fieldErrors)) {
          setError(fieldPath as any, { type: "server", message })
          appliedCount++
        }
      }

      logHotelFlow("hotelSearchForm", "submit_failed", {
        code: result.error.code,
        fieldErrorCount: appliedCount,
      })
      setServerError(
        appliedCount > 0
          ? null
          : toSafeUserErrorMessage(
              result.error.message,
              "Unable to search hotels right now. Please try again."
            )
      )
      return
    }

    logHotelFlow("hotelSearchForm", "submit_succeeded", {})
    
    // We navigate to /hotels/results, serializing the complex occupancies into a JSON string
    // Or we can just store the command in Redis and redirect with a sessionId.
    // For now, passing just the query and dates to results page is fine.
    const searchParams = new URLSearchParams()
    searchParams.set("placeId", result.data.command.placeId)
    searchParams.set("destinationName", destinationName)
    searchParams.set("checkin", result.data.command.checkin)
    searchParams.set("checkout", result.data.command.checkout)
    searchParams.set("occupancies", JSON.stringify(result.data.command.occupancies))
    
    router.push(`/hotels/results?${searchParams.toString()}`)
  }

  const fieldLabelClassName =
    "text-[13px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
  const textFieldClassName =
    "h-14 rounded-xl border-input bg-background px-5 text-base font-medium text-foreground placeholder:text-muted-foreground md:text-base"
  const dateFieldClassName =
    "h-14 rounded-xl border-input bg-background px-4 text-[15px] font-medium text-foreground hover:bg-background"

  return (
    <form
      className="flex h-fit max-h-[80vh] w-full flex-col gap-8 overflow-y-auto rounded-[12px] border border-border bg-background p-4 shadow-xl transition-all duration-300 ease-in-out md:max-h-full md:gap-9 md:p-8"
      onSubmit={onSubmit}
    >
      <FieldGroup className="gap-8">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <HotelPlaceAutocompleteField
            control={control as any}
            name="placeId"
            label="WHERE TO"
            placeholder="Search destinations or hotel"
            labelClassName={fieldLabelClassName}
            inputClassName={textFieldClassName}
            onSelectName={setDestinationName}
          />

          <HotelDatePickerField
            control={control as any}
            name="checkInDate"
            label="CHECK IN"
            labelClassName={fieldLabelClassName}
            triggerClassName={dateFieldClassName}
          />

          <HotelDatePickerField
            control={control as any}
            name="checkOutDate"
            label="CHECK OUT"
            labelClassName={fieldLabelClassName}
            triggerClassName={dateFieldClassName}
          />
        </div>

        <Separator className="bg-border" />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] xl:items-end">
          <HotelGuestInlineControls control={control as any} />

          <Controller
            control={control as any}
            name="rooms"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <PassengerStepper
                  label="Rooms"
                  value={field.value}
                  canDecrease={field.value > 1}
                  canIncrease={field.value < 9}
                  onDecrease={() => field.onChange(field.value - 1)}
                  onIncrease={() => field.onChange(field.value + 1)}
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />

          <LoadingButton
            type="submit"
            isLoading={isSubmitting}
            isError={serverError !== null || Object.keys(errors).length > 0}
            className="h-14 w-full rounded-[10px] text-[16px] font-medium"
          >
            Search Hotels
          </LoadingButton>
        </div>
      </FieldGroup>

      {serverError && (
        <p className="text-base text-destructive">{serverError}</p>
      )}
    </form>
  )
}
