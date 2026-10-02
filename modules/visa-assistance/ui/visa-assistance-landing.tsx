import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Comparison from "@/components/visa-assistance/comparison"
import HowItWorks from "@/components/visa-assistance/how-it-works"
import { VisaPhotoHero } from "./visa-photo-hero"
import { VisaSearchForm } from "@/modules/visa-assistance/ui/visa-search-form"
import { VisaDestinations } from "./landing/visa-destinations"
import { VisaTravelPlans } from "./landing/visa-travel-plans"
import { VisaPreparation } from "./landing/visa-preparation"
import { VisaFaq } from "./landing/visa-faq"

export function VisaAssistanceLanding() {
  return (
    <main className="bg-primary/[0.035]">
      <VisaPhotoHero
        title={
          <>
            Fast, Secure Visa Assistance{" "}
            <span className="text-white/80 italic">Without the Stress</span>
          </>
        }
        description="Simplify your travel with expert visa assistance. Explore available services for your passport country and destination."
        image="/img/hero-visa.webp"
        imagePosition="center 15%"
        alt="Travellers setting off on holiday with their luggage"
      />
      <div
        id="visa-search"
        className="relative mx-auto -mt-8 w-full max-w-screen-2xl scroll-mt-28 px-5 sm:px-8"
      >
        <Card className="gap-0 overflow-visible rounded-[26px] border border-primary/10 bg-card p-5 shadow-[0_16px_45px_-25px_rgba(10,19,69,0.35)] ring-0 sm:p-8">
          <CardHeader className="sr-only">
            <CardTitle>Search our visa services</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <VisaSearchForm />
          </CardContent>
        </Card>
      </div>
      <VisaDestinations />
      <VisaTravelPlans />
      <section className="py-16 md:py-20">
        <div className="mx-auto w-full max-w-screen-2xl px-5 sm:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-12">
            <h2 className="max-w-3xl font-heading text-3xl font-normal tracking-tight md:text-4xl">
              Why travellers prefer Vacatina
              <br /> for their visa applications
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Skip the stress. Vacatina brings together everything you need
            </p>
          </div>
          <Comparison />
        </div>
      </section>
      <section className="pb-16 md:pb-20">
        <div className="mx-auto w-full max-w-screen-2xl px-5 sm:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-12">
            <h2 className="max-w-3xl font-heading text-3xl font-normal tracking-tight md:text-4xl">
              Get Started in 4 Easy Steps
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Your visa journey made simple and straightforward
            </p>
          </div>
          <HowItWorks />
        </div>
      </section>
      <VisaPreparation />
      <VisaFaq />
    </main>
  )
}
