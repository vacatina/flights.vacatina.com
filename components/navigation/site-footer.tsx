import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TiktokIcon,
  WhatsAppIcon,
  XSocialIcon,
} from "@/components/navigation/social-icons"
import { GlobeIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { contactData } from "@/lib/shared/contact-data"

const languageLabel = "English (US)"
const currencyLabel = "USD"

const socialItems = [
  {
    label: "WhatsApp",
    href: `https://wa.me/${contactData.whatsapp.value.replace(/\D/g, "")}`,
    icon: WhatsAppIcon,
  },
  {
    label: "Facebook",
    href: contactData.socials.facebook,
    icon: FacebookIcon,
  },
  {
    label: "Instagram",
    href: contactData.socials.instagram,
    icon: InstagramIcon,
  },
  {
    label: "LinkedIn",
    href: contactData.socials.linkedin,
    icon: LinkedinIcon,
  },
  {
    label: "X",
    href: contactData.socials.twitter,
    icon: XSocialIcon,
  },
  {
    label: "TikTok",
    href: contactData.socials.tiktok,
    icon: TiktokIcon,
  },
] as const

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-muted text-foreground">
      <div className="mx-auto w-full px-6 pt-14 pb-8 lg:px-20 lg:pt-16 lg:pb-10">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/" aria-label="Vacatina home" className="inline-flex">
              <Image
                src="/img/logo-dark.svg"
                alt="Vacatina"
                width={230}
                height={50}
                className="h-[58px] w-auto"
              />
            </Link>

            <div className="mt-8 grid gap-9 sm:grid-cols-2 sm:gap-16 lg:mt-10 lg:gap-18">
              <div className="space-y-2">
                <p className="text-sm leading-none">Toll Free Customer Care</p>
                <a
                  href={`tel:${contactData.phone.value}`}
                  className="mt-1 inline-block text-xl leading-none font-medium tracking-[-0.01em]"
                >
                  {contactData.phone.display}
                </a>
              </div>

              <div className="space-y-2">
                <p className="text-sm leading-none">Need live support?</p>
                <a
                  href={`mailto:${contactData.email}`}
                  className="mt-1 inline-block text-xl leading-none font-medium tracking-[-0.01em]"
                >
                  {contactData.email}
                </a>
              </div>
            </div>
          </div>

          <div className="lg:pt-14">
            <p className="text-[16px] leading-none font-medium">
              Follow us on social media
            </p>
            <div className="mt-6 flex items-center gap-6 text-foreground">
              {socialItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    className="inline-flex items-center justify-center transition-opacity hover:opacity-75"
                  >
                    <Icon />
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] lg:text-[15px]">
              <p>© {year} by&nbsp; Vacatina&nbsp; All rights reserved.</p>
              <Link href="#" className="transition-opacity hover:opacity-75">
                Privacy
              </Link>
              <Link href="#" className="transition-opacity hover:opacity-75">
                Terms
              </Link>
              <Link href="#" className="transition-opacity hover:opacity-75">
                Site Map
              </Link>
            </div>

            <div className="flex items-center gap-4 text-[14px] lg:text-[15px]">
              <GlobeIcon className="size-4.5" />
              <Link href="#" className="underline underline-offset-3">
                {languageLabel}
              </Link>
              <span>$</span>
              <Link href="#" className="underline underline-offset-3">
                {currencyLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
