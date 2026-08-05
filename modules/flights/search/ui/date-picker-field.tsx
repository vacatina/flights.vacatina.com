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

  const isValidDate = field.value && /^\d{4}-\d{2}-\d{2}$/.test(field.value) && !isNaN(new Date(`${field.value}T00:00:00`).getTime())
  const selectedDate = isValidDate ? new Date(`${field.value}T00:00:00`) : undefined

  return (
    <Field
      data-invalid={fieldState.invalid || undefined}
      className={fieldClassName}
    >
      <FieldLabel className={cn("text-sm font-medium", labelClassName)}>
        {label}
      </FieldLabel>
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder="yyyy-mm-dd"
          value={field.value ?? ""}
          onChange={(e) => field.onChange(e.target.value)}
          className={cn(
            "h-14 w-full rounded-xl border border-input bg-background px-4 pr-12 text-base font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/50",
            triggerClassName
          )}
        />
        <Popover>
          <PopoverTrigger
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            render={
              <button type="button" aria-label="Open calendar">
                <CalendarIcon className="size-5 shrink-0" />
              </button>
            }
          />
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              captionLayout="dropdown"
              startMonth={today}
              endMonth={new Date(today.getFullYear() + 3, 11)}
              defaultMonth={selectedDate ?? today}
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
      </div>
      <FieldError>{fieldState.error?.message}</FieldError>
    </Field>
  )
}
