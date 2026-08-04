"use client"

import type { Control } from "react-hook-form"
import { useController } from "react-hook-form"
import { useState } from "react"
import { ChevronDownIcon, MinusIcon, PlusIcon } from "lucide-react"

import { Field, FieldError } from "@/components/ui/field"
import {
  MAX_TOTAL_PASSENGERS,
  MIN_ADULTS,
  type FlightSearchFormValues,
} from "@/modules/flights/search/domain"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent } from "@/components/ui/popover"
import { PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CHILD_AGE_OPTIONS = Array.from({ length: 18 }, (_, index) => index)

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

  const [isAgesPopoverOpen, setIsAgesPopoverOpen] = useState(false)

  const value = field.value
  const totalPassengers = value.adults + value.children

  const canDecreaseAdults = value.adults > MIN_ADULTS
  const canIncreaseAdults = totalPassengers < MAX_TOTAL_PASSENGERS
  const canDecreaseChildren = value.children > 0
  const canIncreaseChildren = totalPassengers < MAX_TOTAL_PASSENGERS

  function update(adults: number, children: number, openPopover = false) {
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

    if (normalizedChildren === 0) {
      setIsAgesPopoverOpen(false)
    } else if (openPopover) {
      setIsAgesPopoverOpen(true)
    }
  }

  function updateChildAge(index: number, age: number) {
    const nextChildrenAges = [...value.childrenAges]
    nextChildrenAges[index] = age

    field.onChange({
      ...value,
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

        <div className="flex flex-col gap-2 relative">
          <Popover 
            open={isAgesPopoverOpen} 
            onOpenChange={(open) => {
              if (open && value.children === 0) return
              setIsAgesPopoverOpen(open)
            }}
          >
            <PopoverTrigger asChild>
              <div 
                className="cursor-pointer"
                onClick={() => {
                  if (value.children > 0) setIsAgesPopoverOpen(true)
                }}
              >
                <PassengerStepper
                  label="Children (2-17)"
                  value={value.children}
                  canDecrease={canDecreaseChildren}
                  canIncrease={canIncreaseChildren}
                  onDecrease={() => update(value.adults, value.children - 1, true)}
                  onIncrease={() => update(value.adults, value.children + 1, true)}
                />
              </div>
            </PopoverTrigger>

            {value.children > 0 && (
              <PopoverContent align="center" className="w-[280px] p-0 rounded-2xl mt-2 overflow-hidden shadow-xl border-border/60">
                <div className="flex flex-col bg-muted/40 px-5 py-3 border-b border-border/50">
                  <span className="text-[15px] font-semibold text-foreground">Select child age{value.children > 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-col p-2 max-h-[320px] overflow-y-auto">
                  {value.childrenAges.map((age, index) => (
                    <div key={index} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-[14px] font-medium text-foreground">Child {index + 1}</span>
                      </div>
                      <Select
                        value={String(age)}
                        onValueChange={(nextValue) =>
                          updateChildAge(index, Number(nextValue))
                        }
                      >
                        <SelectTrigger className="h-9 w-[100px] rounded-lg bg-background border-border/60 shadow-xs px-3 text-[14px] font-medium focus:ring-1 focus:ring-primary/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false} align="end" className="max-h-[240px] rounded-xl shadow-xl border border-border/60">
                          <SelectGroup>
                            {CHILD_AGE_OPTIONS.map((optAge) => (
                              <SelectItem key={optAge} value={String(optAge)} className="rounded-lg text-[14px] cursor-pointer">
                                {optAge} {optAge === 1 ? 'yr' : 'yrs'}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            )}
          </Popover>
        </div>
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
      <div className="flex h-14 w-full overflow-hidden rounded-[10px] border border-input bg-background shadow-xs relative z-10">
        <StepperButton
          symbol={<MinusIcon className="size-4 pointer-events-none" />}
          onClick={(e) => {
            e.stopPropagation()
            onDecrease()
          }}
          disabled={!canDecrease}
          rounded="left"
        />
        <div className="flex flex-1 items-center justify-center border-x border-input px-4 text-[16px] font-medium text-foreground pointer-events-none">
          {value}
        </div>
        <StepperButton
          symbol={<PlusIcon className="size-4 pointer-events-none" />}
          onClick={(e) => {
            e.stopPropagation()
            onIncrease()
          }}
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
  symbol: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  disabled: boolean
  rounded: "left" | "right"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 items-center justify-center font-normal text-muted-foreground transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground/30"
          : "hover:bg-muted text-foreground",
        rounded === "left" ? "rounded-l-[10px]" : "rounded-r-[10px]"
      )}
      aria-label="Change count"
    >
      {symbol}
    </button>
  )
}
