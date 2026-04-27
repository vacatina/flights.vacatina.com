"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftRightIcon, PlusIcon, XIcon } from "lucide-react"
import {
  Controller,
  type Path,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  CABIN_CLASS_LABELS,
  createDefaultFlightSearchValues,
  createEmptySlice,
  ensureSlicesForJourneyType,
  flightSearchFormSchema,
  isMultiCitySearchEnabled,
  MAX_MULTI_CITY_SLICES,
  type CabinClass,
  type FlightSearchFormValues,
  type JourneyType,
} from "@/modules/flights/search/domain"
import { submitFlightSearchAction } from "@/modules/flights/search/server/actions"
import { logFlightFlow } from "@/lib/logging/flow-debug"
import { toSafeUserErrorMessage } from "@/lib/shared/safe-error-message"
import { DatePickerField } from "@/modules/flights/search/ui/date-picker-field"
import { PassengerInlineControls } from "@/modules/flights/search/ui/passenger-inline-controls"
import { PlaceAutocompleteField } from "@/modules/flights/search/ui/place-autocomplete-field"
import { cn } from "@/lib/utils"

const MULTI_CITY_ENABLED = isMultiCitySearchEnabled()
const JOURNEY_OPTIONS: JourneyType[] = MULTI_CITY_ENABLED
  ? ["one_way", "return", "multi_city"]
  : ["one_way", "return"]
const CHILD_AGE_OPTIONS = Array.from({ length: 18 }, (_, index) => index)
const JOURNEY_TAB_LABELS: Record<JourneyType, string> = {
  one_way: "One Way",
  return: "Round Trip",
  multi_city: "Multi City",
}

export function FlightSearchForm() {
  const router = useRouter()
  const [isSubmitting, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<FlightSearchFormValues>({
    resolver: zodResolver(flightSearchFormSchema),
    defaultValues: createDefaultFlightSearchValues(),
    mode: "onSubmit",
  })

  const {
    clearErrors,
    control,
    getValues,
    handleSubmit,
    setError,
    setValue,
    formState: { isSubmitted },
  } = form

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "slices",
  })

  const journeyType = useWatch({
    control,
    name: "journeyType",
  })
  const outboundOrigin = useWatch({
    control,
    name: "slices.0.origin",
  })
  const outboundDestination = useWatch({
    control,
    name: "slices.0.destination",
  })
  const childrenCount = useWatch({
    control,
    name: "passengers.children",
  })

  useEffect(() => {
    logFlightFlow("flightSearchForm", "mounted", {
      defaultJourneyType: form.getValues("journeyType"),
    })
  }, [form])

  useEffect(() => {
    if (journeyType !== "return") {
      return
    }

    setValue("slices.1.origin", outboundDestination ?? null, {
      shouldDirty: false,
      shouldValidate: isSubmitted,
    })
    setValue("slices.1.destination", outboundOrigin ?? null, {
      shouldDirty: false,
      shouldValidate: isSubmitted,
    })
    logFlightFlow("flightSearchForm", "synced_return_leg_from_outbound", {
      outboundOrigin: outboundOrigin?.iataCode,
      outboundDestination: outboundDestination?.iataCode,
    })
  }, [isSubmitted, journeyType, outboundDestination, outboundOrigin, setValue])

  const onSubmit = handleSubmit((values) => {
    logFlightFlow("flightSearchForm", "submit_clicked", {
      journeyType: values.journeyType,
      cabinClass: values.cabinClass,
      sliceCount: values.slices.length,
      adults: values.passengers.adults,
      children: values.passengers.children,
    })
    setServerError(null)
    clearErrors()

    startTransition(() => {
      void submitSearch(values)
    })
  })

  async function submitSearch(values: FlightSearchFormValues) {
    logFlightFlow("flightSearchForm", "submit_started", {
      journeyType: values.journeyType,
      sliceCount: values.slices.length,
    })
    const result = await submitFlightSearchAction(values)

    if (!result.ok) {
      const appliedFieldErrors = applyServerFieldErrors(
        result.error.fieldErrors
      )
      logFlightFlow("flightSearchForm", "submit_failed", {
        code: result.error.code,
        fieldErrorCount: appliedFieldErrors,
      })
      setServerError(
        appliedFieldErrors > 0
          ? null
          : toSafeUserErrorMessage(
              result.error.message,
              "Unable to search flights right now. Please try again."
            )
      )
      return
    }

    logFlightFlow("flightSearchForm", "submit_succeeded", {
      partialOfferRequestId: result.data.partialOfferRequestId,
    })
    router.push(`/results/${result.data.partialOfferRequestId}/fare-options`)
  }

  function updateJourneyType(nextJourneyType: JourneyType) {
    const currentSlices = getValues("slices")
    const adjusted = ensureSlicesForJourneyType(nextJourneyType, currentSlices)

    if (nextJourneyType === "return") {
      const outboundSlice = adjusted[0]
      const inboundSlice = adjusted[1]

      adjusted[1] = {
        ...inboundSlice,
        origin: outboundSlice.destination ?? null,
        destination: outboundSlice.origin ?? null,
      }
    }

    setValue("journeyType", nextJourneyType, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    })

    replace(adjusted)
    logFlightFlow("flightSearchForm", "journey_type_changed", {
      nextJourneyType,
      sliceCount: adjusted.length,
    })
  }

  function applyServerFieldErrors(fieldErrors?: Record<string, string>) {
    if (!fieldErrors) {
      return 0
    }

    let appliedCount = 0

    for (const [fieldPath, message] of Object.entries(fieldErrors)) {
      const resolvedPath = toFormFieldPath(fieldPath)

      if (!resolvedPath) {
        continue
      }

      setError(resolvedPath, {
        type: "server",
        message,
      })
      appliedCount += 1
    }

    if (appliedCount > 0) {
      logFlightFlow("flightSearchForm", "applied_server_field_errors", {
        appliedCount,
      })
    }

    return appliedCount
  }

  const isMultiCityJourney = MULTI_CITY_ENABLED && journeyType === "multi_city"
  const canAddMultiCitySlice =
    isMultiCityJourney && fields.length < MAX_MULTI_CITY_SLICES

  function swapOutboundPlaces() {
    const origin = getValues("slices.0.origin")
    const destination = getValues("slices.0.destination")

    setValue("slices.0.origin", destination ?? null, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    })
    setValue("slices.0.destination", origin ?? null, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    })
  }

  const fieldLabelClassName =
    "text-[13px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
  const textFieldClassName =
    "h-[78px] rounded-[12px] border-input bg-background px-6 text-[18px] font-medium text-foreground placeholder:text-muted-foreground"
  const dateFieldClassName =
    "h-[78px] rounded-[12px] border-input bg-background px-6 text-[17px] font-medium text-foreground hover:bg-background"

  return (
    <form
      className="flex w-full flex-col gap-8 rounded-[12px] border border-border bg-white p-4 shadow-xl md:gap-9 md:p-8"
      onSubmit={onSubmit}
    >
      <FieldGroup className="gap-8">
        <ToggleGroup
          value={[journeyType]}
          onValueChange={(nextValues) => {
            const nextJourneyType = nextValues[0] as JourneyType | undefined

            if (!nextJourneyType || nextJourneyType === journeyType) {
              return
            }

            updateJourneyType(nextJourneyType)
          }}
          className={cn(
            "grid w-full gap-0 rounded-[12px] bg-muted p-1",
            JOURNEY_OPTIONS.length === 3 ? "grid-cols-3" : "grid-cols-2"
          )}
        >
          {JOURNEY_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              variant="default"
              className="h-14 rounded-[10px] border border-transparent text-[15px] font-medium text-foreground transition-colors hover:bg-transparent aria-pressed:border-border aria-pressed:bg-background aria-pressed:text-primary aria-pressed:shadow-sm"
            >
              {JOURNEY_TAB_LABELS[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {!isMultiCityJourney && (
          <div className="flex flex-col gap-7">
            <div
              className={cn(
                "grid gap-6",
                journeyType === "one_way"
                  ? "xl:grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)_minmax(0,1fr)]"
                  : "xl:grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)]"
              )}
            >
              <PlaceAutocompleteField
                control={control}
                name="slices.0.origin"
                label="FROM"
                placeholder="Select origin"
                helperText="Airport code, city, or country"
                labelClassName={fieldLabelClassName}
                inputClassName={textFieldClassName}
              />

              <div className="hidden xl:flex xl:items-end xl:justify-center xl:pb-3">
                <button
                  type="button"
                  onClick={swapOutboundPlaces}
                  className="inline-flex size-[68px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(53,85,213,0.45)] transition-colors hover:bg-primary/90"
                  aria-label="Swap origin and destination"
                >
                  <ArrowLeftRightIcon className="size-8" />
                </button>
              </div>

              <PlaceAutocompleteField
                control={control}
                name="slices.0.destination"
                label="TO"
                placeholder="Select destination"
                helperText="Airport code, city, or country"
                labelClassName={fieldLabelClassName}
                inputClassName={textFieldClassName}
              />

              {journeyType === "one_way" && (
                <DatePickerField
                  control={control}
                  name="slices.0.departureDate"
                  label="DEPART"
                  labelClassName={fieldLabelClassName}
                  triggerClassName={dateFieldClassName}
                />
              )}
            </div>

            {journeyType === "return" && (
              <div className="grid gap-6 xl:grid-cols-2">
                <DatePickerField
                  control={control}
                  name="slices.0.departureDate"
                  label="DEPART"
                  labelClassName={fieldLabelClassName}
                  triggerClassName={dateFieldClassName}
                />
                <DatePickerField
                  control={control}
                  name="slices.1.departureDate"
                  label="RETURN"
                  labelClassName={fieldLabelClassName}
                  triggerClassName={dateFieldClassName}
                />
              </div>
            )}
          </div>
        )}

        {isMultiCityJourney && (
          <div className="flex flex-col gap-6">
            {fields.map((sliceField, index) => (
              <div
                key={sliceField.id}
                className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_84px] xl:items-end"
              >
                <PlaceAutocompleteField
                  control={control}
                  name={`slices.${index}.origin`}
                  label={`FROM ${index + 1}`}
                  placeholder={`Select origin ${index + 1}`}
                  helperText="Airport code, city, or country"
                  labelClassName={fieldLabelClassName}
                  inputClassName={textFieldClassName}
                />
                <PlaceAutocompleteField
                  control={control}
                  name={`slices.${index}.destination`}
                  label={`TO ${index + 1}`}
                  placeholder={`Select destination ${index + 1}`}
                  helperText="Airport code, city, or country"
                  labelClassName={fieldLabelClassName}
                  inputClassName={textFieldClassName}
                />
                <DatePickerField
                  control={control}
                  name={`slices.${index}.departureDate`}
                  label={`DEPART ${index + 1}`}
                  labelClassName={fieldLabelClassName}
                  triggerClassName={dateFieldClassName}
                />
                <button
                  type="button"
                  className="hidden size-[68px] items-center justify-center self-end rounded-full border border-input bg-card transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45 xl:inline-flex"
                  disabled={fields.length <= 2}
                  onClick={() => remove(index)}
                  aria-label={`Remove flight ${index + 1}`}
                >
                  <XIcon className="size-7 text-destructive" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 w-fit items-center rounded-lg border border-input px-4 text-sm font-medium text-destructive transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45 xl:hidden"
                  disabled={fields.length <= 2}
                  onClick={() => remove(index)}
                >
                  Remove flight {index + 1}
                </button>
              </div>
            ))}

            {canAddMultiCitySlice && (
              <button
                type="button"
                className="inline-flex h-16 w-fit items-center gap-3 rounded-[10px] bg-muted px-7 text-[15px] font-medium text-primary transition-colors hover:bg-muted/80"
                onClick={() => append(createEmptySlice())}
              >
                <PlusIcon className="size-5" />
                Add Another Flight
              </button>
            )}
          </div>
        )}

        <Separator className="bg-border" />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1.3fr)_minmax(0,1fr)] xl:items-end">
          <PassengerInlineControls control={control} />

          <Controller
            control={control}
            name="cabinClass"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel className="text-[15px] font-medium text-foreground">
                  Cabin Class
                </FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(nextValue) =>
                    field.onChange(nextValue as CabinClass)
                  }
                >
                  <SelectTrigger className="h-16! w-full rounded-[10px] border-input bg-background px-5 text-[17px] font-normal text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" className="rounded-[10px]">
                    <SelectGroup>
                      {Object.entries(CABIN_CLASS_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-16 w-full rounded-[10px] text-[16px] font-medium"
          >
            {isSubmitting ? "Checking..." : "Search Flights"}
          </Button>
        </div>

        {childrenCount > 0 && (
          <FieldGroup className="gap-4">
            <FieldLabel>Children ages</FieldLabel>
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: childrenCount }).map((_, index) => (
                <Controller
                  key={index}
                  control={control}
                  name={`passengers.childrenAges.${index}`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel>Child {index + 1}</FieldLabel>
                      <Select
                        value={String(field.value ?? 11)}
                        onValueChange={(nextValue) =>
                          field.onChange(Number(nextValue))
                        }
                      >
                        <SelectTrigger className="h-12 w-full rounded-xl px-5 text-base font-normal md:text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="start" className="rounded-xl">
                          <SelectGroup>
                            {CHILD_AGE_OPTIONS.map((age) => (
                              <SelectItem key={age} value={String(age)}>
                                {age} years old
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />
              ))}
            </div>
          </FieldGroup>
        )}
      </FieldGroup>

      {serverError && (
        <p className="text-base text-destructive">{serverError}</p>
      )}
    </form>
  )
}

function toFormFieldPath(path: string): Path<FlightSearchFormValues> | null {
  if (
    path === "journeyType" ||
    path === "cabinClass" ||
    path === "passengers" ||
    path === "passengers.adults" ||
    path === "passengers.children"
  ) {
    return path as Path<FlightSearchFormValues>
  }

  const childrenAgePathPattern = /^passengers\.childrenAges\.\d+$/

  if (childrenAgePathPattern.test(path)) {
    return path as Path<FlightSearchFormValues>
  }

  const slicePathPattern =
    /^slices\.\d+\.(origin|destination|departureDate|departureTime|arrivalTime)$/

  if (slicePathPattern.test(path)) {
    return path as Path<FlightSearchFormValues>
  }

  return null
}
