import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Comparison from "@/components/visa-assistance/comparison"
import HowItWorks from "@/components/visa-assistance/how-it-works"
import { VisaSearchForm } from "@/modules/visa-assistance/ui/visa-search-form"

export function VisaAssistanceLanding() {
  return (
    <main className="bg-muted">
      <section className="relative isolate -mt-[90px] flex min-h-[100dvh] flex-col overflow-hidden pt-[90px] pb-10">
        <div className="absolute inset-0 bg-[url('/img/hero.jpg')] bg-cover bg-center bg-no-repeat" />
        <div className="absolute inset-0 bg-[#05103680]" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-10 md:px-8 md:pt-16 lg:px-12 lg:pt-20">
          <div className="mx-auto flex max-w-5xl animate-in flex-col items-center gap-4 text-center text-white duration-700 fade-in slide-in-from-bottom-3">
            <p className="text-[17px] font-normal text-white/85 md:text-[19px]">
              Simplify your travel with expert visa assistance
            </p>
            <h1 className="font-heading text-[42px] leading-[1.08] font-semibold tracking-[-0.02em] text-balance drop-shadow-sm md:text-[56px] md:leading-[1.05]">
              Fast, Secure Visa Assistance
              <br className="hidden sm:block" /> Without the Stress
            </h1>
          </div>

          <Card className="mx-auto mt-10 w-full max-w-7xl gap-0 overflow-visible rounded-[12px] border border-border bg-background p-4 shadow-xl ring-0 transition-all duration-300 ease-in-out md:mt-12 md:p-8">
            <CardHeader className="sr-only">
              <CardTitle>Search our visa services</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <VisaSearchForm />
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="bg-background py-20 md:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-8 lg:px-12">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-5xl">
              Why travellers prefer Vacatina
              <br /> for their visa applications
            </h2>
            <p className="mt-4 text-muted-foreground">
              Skip the stress. Vacatina brings together everything you need
            </p>
          </div>
          <Comparison />
        </div>
      </section>

      <section className="bg-background pb-20 md:pb-28">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-8 lg:px-12">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-5xl">
              Get Started in 4 Easy Steps
            </h2>
            <p className="mt-4 text-muted-foreground">
              Your visa journey made simple and straightforward
            </p>
          </div>
          <HowItWorks />
        </div>
      </section>
    </main>
  )
}
