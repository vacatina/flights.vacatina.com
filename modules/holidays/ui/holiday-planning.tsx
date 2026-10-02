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
              className="rounded-xl border-0 bg-card px-5"
            >
              <AccordionTrigger>{section.title}</AccordionTrigger>
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
                className="rounded-xl border-0 bg-card px-5"
              >
                <AccordionTrigger>{question.title}</AccordionTrigger>
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
