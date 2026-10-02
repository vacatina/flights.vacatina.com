import { holidayAccordionCard } from "./holiday-surfaces"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { HolidayPackage } from "../domain/types"
import { splitSubsections } from "../domain/content"
import { holidayLabel } from "../domain/catalog"
import { HolidayRichText } from "./holiday-rich-text"
import { HolidaySection } from "./holiday-section"

export function HolidayItinerary({
  holiday,
  longForm,
}: {
  holiday: HolidayPackage
  longForm?: string
}) {
  const days = longForm ? splitSubsections(longForm) : []
  return (
    <HolidaySection title="Your day-by-day itinerary">
      <Accordion defaultValue={[1]} className="gap-2">
        {holiday.itinerary.map((day, index) => (
          <AccordionItem
            key={day.day}
            value={day.day}
            className={holidayAccordionCard}
          >
            <AccordionTrigger className="items-center py-5 hover:no-underline aria-expanded:text-primary">
              <span className="flex items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {String(day.day).padStart(2, "0")}
                </span>
                <span>{day.title}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <HolidayRichText body={days[index]?.body ?? day.description} />
              {!days[index] && day.overnight && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Overnight: {day.overnight}
                </p>
              )}
              {!!day.activities.length && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Activities: {day.activities.map(holidayLabel).join(", ")}
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </HolidaySection>
  )
}
