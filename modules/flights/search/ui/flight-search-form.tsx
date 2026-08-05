"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
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
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
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

const JOURNEY_OPTIONS: JourneyType[] = ["one_way", "return", "multi_city"]
const CHILD_AGE_OPTIONS = Array.from({ length: 18 }, (_, index) => index)
const JOURNEY_TAB_LABELS: Record<JourneyType, string> = {
  one_way: "One Way",
  return: "Round Trip",
  multi_city: "Multi City",
}

interface FlightSearchFormProps {
  initialValues?: FlightSearchFormValues
}

export function FlightSearchForm({ initialValues }: FlightSearchFormProps) {
  const router = useRouter()
  const [isSubmitting, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [expandedFlightIndex, setExpandedFlightIndex] = useState<string>("0")
  const defaultValues = useMemo(() => createDefaultFlightSearchValues(), [])
  const resolvedInitialValues = useMemo(
    () => cloneFlightSearchFormValues(initialValues ?? defaultValues),
    [defaultValues, initialValues]
  )
  const initialValuesSignature = useMemo(
    () => JSON.stringify(resolvedInitialValues),
    [resolvedInitialValues]
  )
  const lastAppliedInitialValuesSignatureRef = useRef(initialValuesSignature)

  const form = useForm<FlightSearchFormValues>({
    resolver: zodResolver(flightSearchFormSchema),
    defaultValues: resolvedInitialValues,
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
    if (lastAppliedInitialValuesSignatureRef.current === initialValuesSignature) {
      return
    }

    lastAppliedInitialValuesSignatureRef.current = initialValuesSignature
    form.reset(cloneFlightSearchFormValues(resolvedInitialValues))
  }, [form, initialValuesSignature, resolvedInitialValues])

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

  const isMultiCityJourney = journeyType === "multi_city"
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
    "h-14 rounded-xl border-input bg-background px-4 text-base font-medium text-foreground placeholder:text-muted-foreground"
  const dateFieldClassName =
    "h-14 rounded-xl border-input bg-background px-4 text-[15px] font-medium text-foreground hover:bg-background"

  return (
    <form
      className="flex w-full h-fit max-h-[80vh] md:max-h-full flex-col gap-8 overflow-y-auto rounded-[12px] border border-border bg-background p-4 shadow-xl transition-all duration-300 ease-in-out md:gap-9 md:p-8"
      onSubmit={onSubmit}
    >
      <FieldGroup className="gap-8">
        {/* Top Controls Bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
              "grid w-full gap-0 rounded-[12px] bg-muted p-1 md:w-[400px]",
              JOURNEY_OPTIONS.length === 3 ? "grid-cols-3" : "grid-cols-2"
            )}
          >
            {JOURNEY_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                variant="default"
                className="h-10 rounded-[10px] border border-transparent text-[14px] font-medium text-foreground transition-colors hover:bg-transparent aria-pressed:border-border aria-pressed:bg-background aria-pressed:text-primary aria-pressed:shadow-sm"
              >
                {JOURNEY_TAB_LABELS[option]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {!isMultiCityJourney && (
          <div className="flex flex-col gap-4">
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_68px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <PlaceAutocompleteField
                control={control}
                name="slices.0.origin"
                label="FROM"
                placeholder="Select origin"
                helperText="Airport code, city, or country"
                labelClassName={fieldLabelClassName}
                inputClassName={textFieldClassName}
              />

              <div className="hidden xl:flex xl:justify-center xl:pt-8">
                <button
                  type="button"
                  onClick={swapOutboundPlaces}
                  className="inline-flex size-[56px] items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
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

              <DatePickerField
                control={control}
                name="slices.0.departureDate"
                label="DEPART"
                labelClassName={fieldLabelClassName}
                triggerClassName={dateFieldClassName}
              />

              {journeyType === "one_way" ? (
                <div className="flex flex-col gap-2">
                  <span className={cn(fieldLabelClassName, "opacity-50")}>RETURN</span>
                  <button
                    type="button"
                    onClick={() => updateJourneyType("return")}
                    className={cn(
                      dateFieldClassName,
                      "flex items-center justify-start border border-dashed text-muted-foreground transition-colors hover:bg-muted"
                    )}
                  >
                    Add return
                  </button>
                </div>
              ) : (
                <DatePickerField
                  control={control}
                  name="slices.1.departureDate"
                  label="RETURN"
                  labelClassName={fieldLabelClassName}
                  triggerClassName={dateFieldClassName}
                />
              )}
            </div>
          </div>
        )}

        {isMultiCityJourney && (
          <div className="flex flex-col gap-6">
            <Accordion
              value={expandedFlightIndex ? [expandedFlightIndex] : []}
              onValueChange={(value) => setExpandedFlightIndex(value[0] ?? "")}
              className="w-full space-y-4"
            >
              {fields.map((sliceField, index) => {
                const origin = getValues(`slices.${index}.origin`)
                const dest = getValues(`slices.${index}.destination`)
                const date = getValues(`slices.${index}.departureDate`)
                
                return (
                  <AccordionItem key={sliceField.id} value={String(index)} className="rounded-xl border border-border/60 bg-card px-2 shadow-sm">
                    <div className="flex w-full items-center justify-between pr-2">
                      <AccordionTrigger className="hover:no-underline py-4 px-2 flex-1">
                        <div className="flex items-center gap-4 text-left">
                          <span className="text-[15px] font-semibold text-primary">Flight {index + 1}</span>
                          {(origin || dest || date) && (
                            <span className="text-[14px] text-muted-foreground font-medium">
                              {[
                                origin?.iataCode,
                                origin && dest ? "to" : null,
                                dest?.iataCode,
                                date ? `• ${date}` : null
                              ].filter(Boolean).join(" ")}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      {fields.length > 2 && (
                        <button
                          type="button"
                          className="ml-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            remove(index)
                            if (expandedFlightIndex === String(index)) {
                              setExpandedFlightIndex(String(Math.max(0, index - 1)))
                            }
                          }}
                          aria-label={`Remove flight ${index + 1}`}
                        >
                          <XIcon className="size-5" />
                        </button>
                      )}
                    </div>
                    <AccordionContent className="pt-2 pb-6 px-2 overflow-visible">
                      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
                        <PlaceAutocompleteField
                          control={control}
                          name={`slices.${index}.origin`}
                          label="FROM"
                          placeholder="Select origin"
                          helperText="Airport code, city, or country"
                          labelClassName={fieldLabelClassName}
                          inputClassName={textFieldClassName}
                        />
                        <PlaceAutocompleteField
                          control={control}
                          name={`slices.${index}.destination`}
                          label="TO"
                          placeholder="Select destination"
                          helperText="Airport code, city, or country"
                          labelClassName={fieldLabelClassName}
                          inputClassName={textFieldClassName}
                        />
                        <DatePickerField
                          control={control}
                          name={`slices.${index}.departureDate`}
                          label="DEPART"
                          labelClassName={fieldLabelClassName}
                          triggerClassName={dateFieldClassName}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>

            {canAddMultiCitySlice && (
              <button
                type="button"
                className="inline-flex h-16 w-fit items-center gap-3 rounded-[10px] bg-muted px-7 text-[15px] font-medium text-primary transition-colors hover:bg-muted/80"
                onClick={() => {
                  const lastSlice = fields[fields.length - 1]
                  append({
                    ...createEmptySlice(),
                    origin: lastSlice?.destination ?? null,
                  })
                  setExpandedFlightIndex(String(fields.length))
                }}
              >
                <PlusIcon className="size-5" />
                Add Another Flight
              </button>
            )}
          </div>
        )}

        <Separator className="bg-border" />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] xl:items-end">
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
                  <SelectTrigger size="lg" className="w-full rounded-[10px] border-input bg-background px-4 text-[15px] font-normal text-foreground">
                    <SelectValue>{CABIN_CLASS_LABELS[field.value]}</SelectValue>
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

          <LoadingButton
            type="submit"
            isLoading={isSubmitting}
            isError={serverError !== null || Object.keys(form.formState.errors).length > 0}
            className="h-14 w-full rounded-[10px] text-[16px] font-medium"
          >
            Search Flights
          </LoadingButton>
        </div>

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

function cloneFlightSearchFormValues(
  values: FlightSearchFormValues
): FlightSearchFormValues {
  return {
    journeyType: values.journeyType,
    cabinClass: values.cabinClass,
    passengers: {
      adults: values.passengers.adults,
      children: values.passengers.children,
      childrenAges: [...values.passengers.childrenAges],
    },
    slices: values.slices.map((slice) => ({
      origin: slice.origin ? { ...slice.origin } : null,
      destination: slice.destination ? { ...slice.destination } : null,
      departureDate: slice.departureDate,
      departureTime: slice.departureTime ? { ...slice.departureTime } : null,
      arrivalTime: slice.arrivalTime ? { ...slice.arrivalTime } : null,
    })),
  }
}
