import { ArrowUpRight, MessageCircle, Phone } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const questions = [
  {
    question: "How do I find the right visa service?",
    answer:
      "Select your passport country and destination in the search form. Review the available services, visit purpose, document checklist, and estimated price before starting a request.",
  },
  {
    question: "Can I request assistance for more than one traveler?",
    answer:
      "Yes. You can add multiple travelers to a request. Each traveler needs their own personal details and traveler-specific documents; shared documents only need to be supplied once when the checklist allows it.",
  },
  {
    question: "Do I need to pay when I start a request?",
    answer:
      "No online payment is required to start a visa assistance request. Our team reviews your details and confirms the final quote before you pay. Estimated prices are shown per traveler.",
  },
  {
    question: "Which documents will I need?",
    answer:
      "Each service has its own checklist on the detail page. Requirements can vary by destination, citizenship, and visit purpose. Review that checklist and follow the secure document instructions in your request.",
  },
  {
    question: "How long will my visa take?",
    answer:
      "Check the processing information on your chosen service. Our team will confirm the expected timeline for your request. Processing times can change and depend on the relevant authority.",
  },
  {
    question: "Does visa assistance guarantee approval?",
    answer:
      "No. The relevant embassy or immigration authority decides whether to issue a visa. Vacatina helps you prepare and manage your request, but cannot guarantee approval or entry.",
  },
]

export function VisaFaq() {
  return (
    <section
      className="mx-auto w-full max-w-screen-2xl px-5 pb-16 sm:px-8 md:pb-20"
      aria-labelledby="visa-faq-title"
    >
      <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="mb-3 text-xs font-medium tracking-[0.15em] text-primary uppercase">
            A little clarity before takeoff
          </p>
          <h2
            id="visa-faq-title"
            className="font-heading text-3xl tracking-tight md:text-4xl"
          >
            Good questions.
            <br />
            <span className="text-primary italic">Clear answers.</span>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            From documents to your final quote, here’s what to know before
            starting your visa journey.
          </p>
          <a
            href="mailto:info@vacatina.com"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            Ask our team <ArrowUpRight className="size-4" />
          </a>
        </div>
        <Accordion className="gap-3">
          {questions.map(({ question, answer }, index) => (
            <AccordionItem
              key={question}
              value={String(index)}
              className="rounded-2xl border border-primary/10 bg-white px-5 shadow-[0_6px_18px_-16px_rgba(10,19,69,0.3)]"
            >
              <AccordionTrigger className="py-5 text-base hover:no-underline">
                {question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <div className="mt-14 flex flex-col gap-6 rounded-[28px] border border-primary/15 bg-primary/[0.06] p-7 md:flex-row md:items-center md:justify-between md:p-10">
        <div className="flex items-center gap-5">
          <span className="hidden size-16 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm sm:flex">
            <MessageCircle className="size-7" strokeWidth={1.5} />
          </span>
          <div>
            <h3 className="font-heading text-2xl tracking-tight">
              Your next journey starts with a conversation.
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Need a hand choosing a service? Talk to the Vacatina team.
            </p>
          </div>
        </div>
        <a
          href="tel:+94113606200"
          className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <Phone className="size-4" /> 0113 606 200{" "}
          <ArrowUpRight className="ml-2 size-4" />
        </a>
      </div>
    </section>
  )
}
