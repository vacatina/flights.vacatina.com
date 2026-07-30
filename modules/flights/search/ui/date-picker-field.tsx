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
import { cn } from "@/lib/utils"

interface DatePickerFieldProps {
  control: Control<FlightSearchFormValues>
  name: `slices.${number}.departureDate`
  label: string
  fieldClassName?: string
  labelClassName?: string
  triggerClassName?: string
}

export function DatePickerField({
  control,
  name,
  label,
  fieldClassName,
  labelClassName,
  triggerClassName,
}: DatePickerFieldProps) {
  const { field, fieldState } = useController({ control, name })
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const selectedDate = field.value ? new Date(`${field.value}T00:00:00`) : undefined

  const displayValue = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "yyyy-mm-dd"

  return (
    <Field
      data-invalid={fieldState.invalid || undefined}
      className={fieldClassName}
    >
      <FieldLabel className={cn("text-sm font-medium", labelClassName)}>
        {label}
      </FieldLabel>
      <Popover>
        <PopoverTrigger
          className="w-full"
          render={
            <Button
              variant="outline"
              className={cn(
                "h-14 w-full justify-between rounded-xl border-input bg-background px-5 text-base font-normal text-foreground hover:bg-background",
                triggerClassName
              )}
            >
              <span>{displayValue}</span>
              <CalendarIcon data-icon="inline-end" />
            </Button>
          }
        />
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            disabled={{ before: today }}
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
