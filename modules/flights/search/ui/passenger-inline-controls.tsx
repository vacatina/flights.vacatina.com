"use client"

import type { Control } from "react-hook-form"
import { useController } from "react-hook-form"

import { Field, FieldError } from "@/components/ui/field"
import {
  MAX_TOTAL_PASSENGERS,
  MIN_ADULTS,
  type FlightSearchFormValues,
} from "@/modules/flights/search/domain"
import { cn } from "@/lib/utils"

interface PassengerInlineControlsProps {
  control: Control<FlightSearchFormValues>
  className?: string
}

export function PassengerInlineControls({
  control,
  className,
}: PassengerInlineControlsProps) {
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
    const normalizedChildren = Math.max(children, 0)
    const nextChildrenAges = value.childrenAges.slice(0, normalizedChildren)

    while (nextChildrenAges.length < normalizedChildren) {
      nextChildrenAges.push(11)
    }

    field.onChange({
      adults,
      children: normalizedChildren,
      childrenAges: nextChildrenAges,
    })
  }

  return (
    <Field
      data-invalid={fieldState.invalid || undefined}
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <PassengerStepper
          label="Adults (18+)"
          value={value.adults}
          canDecrease={canDecreaseAdults}
          canIncrease={canIncreaseAdults}
          onDecrease={() => update(value.adults - 1, value.children)}
          onIncrease={() => update(value.adults + 1, value.children)}
        />

        <PassengerStepper
          label="Children (2-17)"
          value={value.children}
          canDecrease={canDecreaseChildren}
          canIncrease={canIncreaseChildren}
          onDecrease={() => update(value.adults, value.children - 1)}
          onIncrease={() => update(value.adults, value.children + 1)}
        />
      </div>

      <FieldError>{fieldState.error?.message}</FieldError>
    </Field>
  )
}

function PassengerStepper({
  label,
  value,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
}: {
  label: string
  value: number
  canDecrease: boolean
  canIncrease: boolean
  onDecrease: () => void
  onIncrease: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[15px] font-medium tracking-[-0.01em] text-foreground">
        {label}
      </p>
      <div className="flex h-16 w-fit overflow-hidden rounded-[10px] border border-input bg-background shadow-xs">
        <StepperButton
          symbol="−"
          onClick={onDecrease}
          disabled={!canDecrease}
          rounded="left"
        />
        <div className="flex min-w-18 items-center justify-center border-x border-input px-4 text-[18px] font-medium text-foreground">
          {value}
        </div>
        <StepperButton
          symbol="+"
          onClick={onIncrease}
          disabled={!canIncrease}
          rounded="right"
        />
      </div>
    </div>
  )
}

function StepperButton({
  symbol,
  onClick,
  disabled,
  rounded,
}: {
  symbol: string
  onClick: () => void
  disabled: boolean
  rounded: "left" | "right"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-16 items-center justify-center text-[18px] font-normal text-muted-foreground transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground/50"
          : "hover:bg-muted",
        rounded === "left" ? "rounded-l-[10px]" : "rounded-r-[10px]"
      )}
      aria-label={symbol === "+" ? "Increase count" : "Decrease count"}
    >
      {symbol}
    </button>
  )
}
