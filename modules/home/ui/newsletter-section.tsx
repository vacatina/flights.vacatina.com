"use client"

import { FormEvent, useState } from "react"
import { CheckCircle2Icon, MailIcon } from "lucide-react"

type Status = "idle" | "loading" | "success" | "error"

export function NewsletterSection() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalized = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setStatus("error")
      return
    }

    setStatus("loading")
    window.setTimeout(() => setStatus("success"), 700)
  }

  return (
    <section className="mx-auto w-full max-w-[1320px] px-4 pb-16 sm:px-6 md:pb-20 lg:px-8">
      <div className="rounded-[24px] border border-[#E5E5E5] bg-[#FAFAFA] p-6 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#1B1464] uppercase">
              Vacatina Updates
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.03em] text-[#111]">
              Inspiration for Your Next Journey
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#525252]">
              Travel ideas, destination inspiration and Vacatina updates. This
              prototype does not connect to a marketing subscription backend yet.
            </p>
          </div>

          {status === "success" ? (
            <div
              role="status"
              className="flex min-h-28 items-center gap-3 rounded-2xl border border-[#15803D]/20 bg-white p-5 text-[#15803D]"
            >
              <CheckCircle2Icon className="size-6" aria-hidden="true" />
              <div>
                <p className="font-semibold">Prototype subscription captured</p>
                <p className="mt-1 text-sm text-[#525252]">
                  No real mailing list request was sent.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label
                htmlFor="homepage-newsletter-email"
                className="text-sm font-semibold text-[#111]"
              >
                Email address
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <MailIcon
                    className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#525252]"
                    aria-hidden="true"
                  />
                  <input
                    id="homepage-newsletter-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    aria-invalid={status === "error"}
                    aria-describedby={
                      status === "error" ? "homepage-newsletter-error" : undefined
                    }
                    onChange={(event) => {
                      setEmail(event.target.value)
                      if (status === "error") setStatus("idle")
                    }}
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-[10px] border border-[#E5E5E5] bg-white pr-4 pl-11 text-sm outline-none focus:border-[#1B1464] focus:ring-2 focus:ring-[#1B1464]/15"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="min-h-12 rounded-[10px] bg-[#1B1464] px-6 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
                >
                  {status === "loading" ? "Subscribing..." : "Subscribe"}
                </button>
              </div>
              {status === "error" ? (
                <p
                  id="homepage-newsletter-error"
                  className="mt-2 text-sm text-[#B91C1C]"
                  role="alert"
                >
                  Enter a valid email address.
                </p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
