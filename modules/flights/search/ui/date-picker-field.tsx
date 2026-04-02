"use client"

import type { Control } from "react-hook-form"
import { useController } from "react-hook-form"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { FlightSearchFormValues } from "@/modules/flights/search/domain"

interface DatePickerFieldProps {
  control: Control<FlightSearchFormValues>
  name: `slices.${number}.departureDate`
  label: string
}

export function DatePickerField({ control, name, label }: DatePickerFieldProps) {
  const { field, fieldState } = useController({ control, name })

  const selectedDate = field.value ? new Date(`${field.value}T00:00:00`) : undefined

  const displayValue = selectedDate ? format(selectedDate, "dd / MM / yyyy") : "DD / MM / YYYY"

  return (
    <Field data-invalid={fieldState.invalid || undefined}>
      <FieldLabel>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger
          className="w-full"
          render={
            <Button
              variant="outline"
              className="h-14 w-full justify-start rounded-xl px-6 text-[1.8rem] font-normal text-muted-foreground md:text-base"
            >
              <CalendarIcon data-icon="inline-start" />
              <span>{displayValue}</span>
            </Button>
          }
        />
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) {
                return
              }

              field.onChange(format(date, "yyyy-MM-dd"))
            }}
          />
        </PopoverContent>
      </Popover>
      <FieldError>{fieldState.error?.message}</FieldError>
    </Field>
  )
}
