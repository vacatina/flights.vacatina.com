"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function VisaProductFaq({
  destination,
  maximumStay,
  entries,
}: {
  destination: string
  maximumStay: string | null
  entries: string | null
}) {
  const questions = [
    {
      question: `How long can I stay in ${destination}?`,
      answer: maximumStay
        ? `The available visa currently shows a maximum stay of ${maximumStay}. Confirm this again before departure.`
        : "A maximum stay is not currently specified. Confirm it with the application provider before booking.",
    },
    {
      question: "How many times can I enter?",
      answer: entries
        ? `The available visa is listed as ${entries.toLowerCase()}. Each entry must follow the stated validity and stay limits.`
        : "The number of entries is not currently specified. Check it during the application process.",
    },
    {
      question: "Does Vacatina issue the visa?",
      answer:
        "Vacatina manages the application experience, but the relevant immigration authority makes the final visa decision and issues the visa.",
    },
    {
      question: "Is visa approval guaranteed?",
      answer:
        "No. Approval and permission to enter are decided by the relevant immigration authorities.",
    },
  ]

  return (
    <section aria-labelledby="visa-faq-heading" className="max-w-4xl">
      <h2
        id="visa-faq-heading"
        className="font-heading text-2xl font-semibold tracking-[-0.025em] md:text-3xl"
      >
        Common questions
      </h2>
      <Accordion className="mt-6 border-t">
        {questions.map(({ question, answer }) => (
          <AccordionItem key={question} value={question}>
            <AccordionTrigger className="py-5 text-base font-semibold hover:no-underline">
              {question}
            </AccordionTrigger>
            <AccordionContent className="max-w-2xl pb-5 leading-relaxed text-muted-foreground">
              {answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
