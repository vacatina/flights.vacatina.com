"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon, PlusIcon, XIcon } from "lucide-react"
import {
  Controller,
  type Path,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
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
  JOURNEY_TYPE_LABELS,
  MAX_MULTI_CITY_SLICES,
  type CabinClass,
  type FlightSearchFormValues,
  type JourneyType,
} from "@/modules/flights/search/domain"
import { submitFlightSearchAction } from "@/modules/flights/search/server/actions"
import { DatePickerField } from "@/modules/flights/search/ui/date-picker-field"
import { PassengersPopover } from "@/modules/flights/search/ui/passengers-popover"
import { PlaceAutocompleteField } from "@/modules/flights/search/ui/place-autocomplete-field"
import { TimeRangePopover } from "@/modules/flights/search/ui/time-range-popover"

const JOURNEY_OPTIONS: JourneyType[] = ["one_way", "return", "multi_city"]

export function FlightSearchForm() {
  const [isSubmitting, startTransition] = useTransition()
  const [serverMessage, setServerMessage] = useState<string | null>(null)
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

  const onSubmit = handleSubmit((values) => {
    setServerMessage(null)
    setServerError(null)
    clearErrors()

    startTransition(() => {
      void submitSearch(values)
    })
  })

  async function submitSearch(values: FlightSearchFormValues) {
    const result = await submitFlightSearchAction(values)

    if (!result.ok) {
      const appliedFieldErrors = applyServerFieldErrors(result.error.fieldErrors)
      setServerError(appliedFieldErrors > 0 ? null : result.error.message)
      return
    }

    setServerMessage(`Search request logged on server (${result.data.requestId}).`)
  }

  function updateJourneyType(nextJourneyType: JourneyType) {
    const currentSlices = getValues("slices")
    const adjusted = ensureSlicesForJourneyType(nextJourneyType, currentSlices)

    if (nextJourneyType === "return") {
      const outboundSlice = adjusted[0]
      const inboundSlice = adjusted[1]

      adjusted[1] = {
        ...inboundSlice,
        origin: inboundSlice.origin ?? outboundSlice.destination,
        destination: inboundSlice.destination ?? outboundSlice.origin,
      }
    }

    setValue("journeyType", nextJourneyType, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    })

    replace(adjusted)
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

    return appliedCount
  }

  const canAddMultiCitySlice =
    journeyType === "multi_city" && fields.length < MAX_MULTI_CITY_SLICES

  return (
    <form
      className="flex w-full flex-col gap-9 rounded-3xl border bg-card/70 p-5 md:p-8"
      onSubmit={onSubmit}
    >
      <FieldGroup className="gap-9">
        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-3xl font-semibold md:text-2xl">Journey type</h2>
          <ToggleGroup
            value={[journeyType]}
            onValueChange={(nextValues) => {
              const nextJourneyType = nextValues[0] as JourneyType | undefined

              if (!nextJourneyType || nextJourneyType === journeyType) {
                return
              }

              updateJourneyType(nextJourneyType)
            }}
            className="flex-wrap gap-6"
          >
            {JOURNEY_OPTIONS.map((option) => {
              const selected = option === journeyType

              return (
                <ToggleGroupItem
                  key={option}
                  value={option}
                  variant="default"
                  className="h-auto rounded-full p-0 text-[2rem] font-normal hover:bg-transparent data-[state=on]:bg-transparent md:text-lg"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex size-10 items-center justify-center rounded-full border ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-transparent"
                      }`}
                    >
                      <CheckIcon className="size-5" />
                    </span>
                    {JOURNEY_TYPE_LABELS[option]}
                  </span>
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
        </div>

        {journeyType !== "multi_city" && (
          <div className="flex flex-col gap-7">
            <div className="grid gap-6 md:grid-cols-2">
              <PlaceAutocompleteField
                control={control}
                name="slices.0.origin"
                label="Origin"
                placeholder="Origin"
              />
              <PlaceAutocompleteField
                control={control}
                name="slices.0.destination"
                label="Destination"
                placeholder="Destination"
              />
            </div>

            {journeyType === "one_way" && (
              <div className="flex flex-col gap-2">
                <DatePickerField
                  control={control}
                  name="slices.0.departureDate"
                  label="Departure date"
                />
                <TimeRangePopover
                  control={control}
                  departureName="slices.0.departureTime"
                  arrivalName="slices.0.arrivalTime"
                />
              </div>
            )}

            {journeyType === "return" && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <DatePickerField
                    control={control}
                    name="slices.0.departureDate"
                    label="Departure date"
                  />
                  <TimeRangePopover
                    control={control}
                    departureName="slices.0.departureTime"
                    arrivalName="slices.0.arrivalTime"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <DatePickerField
                    control={control}
                    name="slices.1.departureDate"
                    label="Return date"
                  />
                  <TimeRangePopover
                    control={control}
                    departureName="slices.1.departureTime"
                    arrivalName="slices.1.arrivalTime"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {journeyType === "multi_city" && (
          <div className="flex flex-col gap-5">
            {fields.map((sliceField, index) => (
              <Card key={sliceField.id} className="rounded-2xl bg-background/70 shadow-none">
                <CardContent className="flex flex-col gap-6 p-6 md:p-7">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-muted px-4 py-2 text-sm font-medium">
                      Flight {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11 rounded-xl"
                      disabled={fields.length <= 2}
                      onClick={() => remove(index)}
                    >
                      <XIcon />
                    </Button>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <PlaceAutocompleteField
                      control={control}
                      name={`slices.${index}.origin`}
                      label="Origin"
                      placeholder="Origin"
                    />
                    <PlaceAutocompleteField
                      control={control}
                      name={`slices.${index}.destination`}
                      label="Destination"
                      placeholder="Destination"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <DatePickerField
                      control={control}
                      name={`slices.${index}.departureDate`}
                      label="Departure date"
                    />
                    <TimeRangePopover
                      control={control}
                      departureName={`slices.${index}.departureTime`}
                      arrivalName={`slices.${index}.arrivalTime`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            {canAddMultiCitySlice && (
              <Button
                type="button"
                variant="secondary"
                className="h-12 w-fit rounded-xl px-5 text-[1.8rem] font-semibold md:text-base"
                onClick={() => append(createEmptySlice())}
              >
                <PlusIcon data-icon="inline-start" />
                Add another flight
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <PassengersPopover control={control} />

          <Controller
            control={control}
            name="cabinClass"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel>Class</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(nextValue) =>
                    field.onChange(nextValue as CabinClass)
                  }
                >
                  <SelectTrigger className="h-14 w-full rounded-xl px-6 text-[1.8rem] font-normal md:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" className="rounded-xl">
                    <SelectGroup>
                      {Object.entries(CABIN_CLASS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />
        </div>

        <Button
          type="button"
          variant="link"
          className="self-end px-0 text-3xl font-medium text-primary md:text-lg"
        >
          Advanced options
        </Button>
      </FieldGroup>

      {serverError && <p className="text-base text-destructive">{serverError}</p>}
      {serverMessage && <p className="text-base text-emerald-600">{serverMessage}</p>}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="h-16 w-full rounded-xl text-[2.1rem] font-semibold md:text-2xl"
      >
        {isSubmitting ? "Checking..." : "Find available flights"}
      </Button>
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

  const slicePathPattern =
    /^slices\.\d+\.(origin|destination|departureDate|departureTime|arrivalTime)$/

  if (slicePathPattern.test(path)) {
    return path as Path<FlightSearchFormValues>
  }

  return null
}
