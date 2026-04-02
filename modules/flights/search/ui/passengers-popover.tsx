"use client"

import type { Control } from "react-hook-form"
import { useController } from "react-hook-form"
import { ChevronDownIcon, MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  formatPassengerSummary,
  MAX_TOTAL_PASSENGERS,
  MIN_ADULTS,
  type FlightSearchFormValues,
} from "@/modules/flights/search/domain"

interface PassengersPopoverProps {
  control: Control<FlightSearchFormValues>
}

export function PassengersPopover({ control }: PassengersPopoverProps) {
  const { field, fieldState } = useController({
    control,
    name: "passengers",
  })

  const value = field.value

  const totalPassengers = value.adults + value.children

  const canDecreaseAdults = value.adults > MIN_ADULTS
  const canIncreaseAdults = totalPassengers < MAX_TOTAL_PASSENGERS
  const canDecreaseChildren = value.children > 0
  const canIncreaseChildren = totalPassengers < MAX_TOTAL_PASSENGERS

  function update(adults: number, children: number) {
    field.onChange({ adults, children })
  }

  return (
    <Field data-invalid={fieldState.invalid || undefined}>
      <FieldLabel>Passengers</FieldLabel>
      <Popover>
        <PopoverTrigger
          className="w-full"
          render={
            <Button
              type="button"
              variant="outline"
              className="h-14 w-full justify-between rounded-xl px-6 text-[1.8rem] font-normal md:text-base"
            >
              <span>{formatPassengerSummary(value)}</span>
              <ChevronDownIcon data-icon="inline-end" />
            </Button>
          }
        />
        <PopoverContent align="start" className="w-[460px] max-w-[calc(100vw-2rem)] gap-4 rounded-xl">
          <div className="flex flex-col gap-5">
            <PassengerRow
              title="Adults"
              subtitle="18+"
              value={value.adults}
              onDecrease={() => update(value.adults - 1, value.children)}
              onIncrease={() => update(value.adults + 1, value.children)}
              canDecrease={canDecreaseAdults}
              canIncrease={canIncreaseAdults}
            />

            <Separator />

            <PassengerRow
              title="Children"
              subtitle="0-17"
              value={value.children}
              onDecrease={() => update(value.adults, value.children - 1)}
              onIncrease={() => update(value.adults, value.children + 1)}
              canDecrease={canDecreaseChildren}
              canIncrease={canIncreaseChildren}
            />
          </div>
        </PopoverContent>
      </Popover>
      <FieldError>{fieldState.error?.message}</FieldError>
    </Field>
  )
}

interface PassengerRowProps {
  title: string
  subtitle: string
  value: number
  onDecrease: () => void
  onIncrease: () => void
  canDecrease: boolean
  canIncrease: boolean
}

function PassengerRow({
  title,
  subtitle,
  value,
  onDecrease,
  onIncrease,
  canDecrease,
  canIncrease,
}: PassengerRowProps) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex flex-col">
        <span className="text-3xl font-semibold md:text-2xl">{title}</span>
        <span className="text-muted-foreground">{subtitle}</span>
      </div>

      <div className="flex items-center gap-5">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="size-12 rounded-xl"
          disabled={!canDecrease}
          onClick={onDecrease}
        >
          <MinusIcon />
        </Button>
        <span className="w-8 text-center text-4xl font-medium md:text-3xl">{value}</span>
        <Button
          type="button"
          size="icon"
          className="size-12 rounded-xl"
          disabled={!canIncrease}
          onClick={onIncrease}
        >
          <PlusIcon />
        </Button>
      </div>
    </div>
  )
}
