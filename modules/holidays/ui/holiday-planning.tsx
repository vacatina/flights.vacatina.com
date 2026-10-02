import { holidayAccordionCard } from "./holiday-surfaces"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { ContentSection } from "../domain/content"
import { splitSubsections } from "../domain/content"
import { HolidayRichText } from "./holiday-rich-text"
import { HolidaySection } from "./holiday-section"

export function HolidayPlanning({
  sections,
  faq,
}: {
  sections: ContentSection[]
  faq?: string
}) {
  const questions = faq ? splitSubsections(faq) : []
  return (
    <>
      <HolidaySection title="Planning your trip">
        <Accordion className="gap-2">
          {sections.map((section) => (
            <AccordionItem
              key={section.title}
              value={section.title}
              className={holidayAccordionCard}
            >
              <AccordionTrigger className="items-center py-5 hover:no-underline aria-expanded:text-primary">
                {section.title}
              </AccordionTrigger>
              <AccordionContent>
                <HolidayRichText body={section.body} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </HolidaySection>
      {!!questions.length && (
        <HolidaySection title="Frequently asked questions">
          <Accordion className="gap-2">
            {questions.map((question) => (
              <AccordionItem
                key={question.title}
                value={question.title}
                className={holidayAccordionCard}
              >
                <AccordionTrigger className="items-center py-5 hover:no-underline aria-expanded:text-primary">
                  {question.title}
                </AccordionTrigger>
                <AccordionContent>
                  <HolidayRichText body={question.body} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </HolidaySection>
      )}
    </>
  )
}
