"use client"

import { useMemo } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"

import { LoadingButton } from "@/components/ui/loading-button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CABIN_CLASS_LABELS, createDefaultFlightSearchValues, type CabinClass, type FlightSearchFormValues, type PlaceSuggestionOption } from "@/modules/flights/search/domain"
import { DatePickerField } from "@/modules/flights/search/ui/date-picker-field"
import { PlaceAutocompleteField } from "@/modules/flights/search/ui/place-autocomplete-field"
import { cn } from "@/lib/utils"
import { searchItineraryChangesAction } from "@/modules/flights/changes/server/actions"

interface Props { bookingReference: string; sliceId: string; origin: string; destination: string; departureDate: string; selectedJourneyLabel?: string }

export function ChangeFlightSearchForm({ bookingReference, sliceId, origin, destination, departureDate, selectedJourneyLabel }: Props) {
  const initialValues = useMemo<FlightSearchFormValues>(() => {
    const values = createDefaultFlightSearchValues()
    values.slices[0] = { origin: createPlace(origin), destination: createPlace(destination), departureDate, departureTime: null, arrivalTime: null }
    return values
  }, [departureDate, destination, origin])
  const form = useForm<FlightSearchFormValues>({ defaultValues: initialValues })
  const originValue = useWatch({ control: form.control, name: "slices.0.origin" })
  const destinationValue = useWatch({ control: form.control, name: "slices.0.destination" })
  const departureDateValue = useWatch({ control: form.control, name: "slices.0.departureDate" })
  const cabinClass = useWatch({ control: form.control, name: "cabinClass" })
  const fieldLabelClassName = "text-[13px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
  const textFieldClassName = "h-14 rounded-xl border-input bg-background px-4 text-base font-medium text-foreground placeholder:text-muted-foreground"
  const dateFieldClassName = "h-14 rounded-xl border-input bg-background px-4 text-[15px] font-medium text-foreground hover:bg-background"

  return <form action={searchItineraryChangesAction} className="flex w-full flex-col gap-7 rounded-xl border border-border bg-card p-5 shadow-sm md:p-7" onSubmit={(event) => {
    if (!originValue || !destinationValue || !departureDateValue) {
      event.preventDefault()
      if (!originValue) form.setError("slices.0.origin", { message: "Choose an origin" })
      if (!destinationValue) form.setError("slices.0.destination", { message: "Choose a destination" })
      if (!departureDateValue) form.setError("slices.0.departureDate", { message: "Choose a departure date" })
    }
  }}>
    <input type="hidden" name="bookingReference" value={bookingReference} />
    <input type="hidden" name="sliceId" value={sliceId} />
    <input type="hidden" name="origin" value={originValue?.iataCode ?? ""} />
    <input type="hidden" name="destination" value={destinationValue?.iataCode ?? ""} />
    <input type="hidden" name="departureDate" value={departureDateValue ?? ""} />
    <input type="hidden" name="cabinClass" value={cabinClass} />
    <div><p className="text-sm font-medium uppercase tracking-[0.08em] text-primary">Replacement journey</p><p className="mt-2 text-sm text-muted-foreground">{selectedJourneyLabel ? `Replacing ${selectedJourneyLabel}. ` : ""}Choose where and when you would prefer to fly.</p></div>
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
      <PlaceAutocompleteField control={form.control} name="slices.0.origin" label="FROM" placeholder="Select origin" helperText="Airport code, city, or country" labelClassName={fieldLabelClassName} inputClassName={textFieldClassName} />
      <PlaceAutocompleteField control={form.control} name="slices.0.destination" label="TO" placeholder="Select destination" helperText="Airport code, city, or country" labelClassName={fieldLabelClassName} inputClassName={textFieldClassName} />
      <DatePickerField control={form.control} name="slices.0.departureDate" label="DEPART" labelClassName={fieldLabelClassName} triggerClassName={dateFieldClassName} />
      <Controller control={form.control} name="cabinClass" render={({ field, fieldState }) => <Field data-invalid={fieldState.invalid || undefined}><FieldLabel className={fieldLabelClassName}>Cabin class</FieldLabel><Select value={field.value} onValueChange={(value) => field.onChange(value as CabinClass)}><SelectTrigger size="lg" className={cn(dateFieldClassName, "w-full rounded-xl px-4 text-[15px] font-normal")}><SelectValue>{CABIN_CLASS_LABELS[field.value]}</SelectValue></SelectTrigger><SelectContent align="start" className="rounded-[10px]"><SelectGroup>{Object.entries(CABIN_CLASS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent></Select><FieldError>{fieldState.error?.message}</FieldError></Field>} />
    </div>
    <LoadingButton type="submit" className="h-14 w-full rounded-[10px] text-[16px] font-medium md:w-fit md:min-w-72">Search replacement flights</LoadingButton>
  </form>
}

function createPlace(iataCode: string): PlaceSuggestionOption {
  const code = iataCode.trim().toUpperCase()
  return { id: `airport_${code.toLowerCase()}`, type: "airport", iataCode: code, iataCityCode: null, name: code, cityName: null, countryCode: "ZZ", countryName: null, displayName: code }
}
