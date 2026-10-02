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
            className="rounded-xl border-0 bg-card px-5"
          >
            <AccordionTrigger>
              Day {day.day}: {day.title}
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
