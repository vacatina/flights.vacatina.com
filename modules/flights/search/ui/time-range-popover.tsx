"use client"

import { useState } from "react"
import type { Control } from "react-hook-form"
import { useController } from "react-hook-form"
import { ChevronDownIcon, PlaneLandingIcon, PlaneTakeoffIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import {
  formatTimeRange,
  sliderRangeToTimeRange,
  timeRangeToSliderRange,
  type FlightSearchFormValues,
  type SliderRange,
} from "@/modules/flights/search/domain"

interface TimeRangePopoverProps {
  control: Control<FlightSearchFormValues>
  departureName: `slices.${number}.departureTime`
  arrivalName: `slices.${number}.arrivalTime`
}

export function TimeRangePopover({
  control,
  departureName,
  arrivalName,
}: TimeRangePopoverProps) {
  const departureController = useController({
    control,
    name: departureName,
  })

  const arrivalController = useController({
    control,
    name: arrivalName,
  })

  const [open, setOpen] = useState(false)
  const [draftDeparture, setDraftDeparture] = useState<SliderRange>(
    timeRangeToSliderRange(departureController.field.value)
  )
  const [draftArrival, setDraftArrival] = useState<SliderRange>(
    timeRangeToSliderRange(arrivalController.field.value)
  )

  const isAnyTime = !departureController.field.value && !arrivalController.field.value

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraftDeparture(timeRangeToSliderRange(departureController.field.value))
      setDraftArrival(timeRangeToSliderRange(arrivalController.field.value))
    }

    setOpen(nextOpen)
  }

  function commit() {
    departureController.field.onChange(sliderRangeToTimeRange(draftDeparture))
    arrivalController.field.onChange(sliderRangeToTimeRange(draftArrival))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 text-lg font-medium text-primary md:text-base"
          >
            {isAnyTime ? "At any time" : "Custom time"}
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-[520px] max-w-[calc(100vw-2rem)] rounded-xl p-6">
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <PlaneTakeoffIcon className="size-4" />
                <span className="font-medium">Take-off</span>
              </div>
              <span>{formatTimeRange(sliderRangeToTimeRange(draftDeparture))}</span>
            </div>
            <Slider
              min={0}
              max={1439}
              step={15}
              value={draftDeparture}
              onValueChange={(value) => setDraftDeparture(value as SliderRange)}
            />
            <div className="flex items-center justify-between text-muted-foreground">
              <span>00:00</span>
              <span>08:00</span>
              <span>16:00</span>
              <span>23:59</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <PlaneLandingIcon className="size-4" />
                <span className="font-medium">Landing</span>
              </div>
              <span>{formatTimeRange(sliderRangeToTimeRange(draftArrival))}</span>
            </div>
            <Slider
              min={0}
              max={1439}
              step={15}
              value={draftArrival}
              onValueChange={(value) => setDraftArrival(value as SliderRange)}
            />
            <div className="flex items-center justify-between text-muted-foreground">
              <span>00:00</span>
              <span>08:00</span>
              <span>16:00</span>
              <span>23:59</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" className="h-12 rounded-xl px-8" onClick={commit}>
              Confirm
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
