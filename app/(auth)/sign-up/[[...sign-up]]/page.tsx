import { SignUp } from "@clerk/nextjs"
import Image from "next/image"
import Link from "next/link"

export default function SignUpPage() {
  return (
    <main className="h-svh grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-[#5f83a8] via-[#e8a878] via-55% to-[#1a2a3d]" />
        <div className="absolute inset-0 bg-[url('/img/hero.jpg')] bg-cover bg-center bg-no-repeat opacity-80" />
        <div className="absolute inset-0 bg-[#05103680]" />

        <div className="relative z-20">
          <Link href="/" aria-label="Vacatina home">
            <Image
              src="/img/logo-light.svg"
              alt="Vacatina"
              width={230}
              height={50}
              priority
              className="h-[30px] w-auto lg:h-[40px]"
            />
          </Link>
        </div>

        <div className="relative z-20">
          <blockquote className="space-y-2">
            <p className="text-[19px] leading-relaxed font-medium text-white/90">
              &ldquo;Book everything in one place. Flights, hotels, cruises, cars, and experiences. All beautifully integrated.&rdquo;
            </p>
          </blockquote>
        </div>
      </div>
      <div className="flex flex-col justify-center items-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-[480px] py-8">
          <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
        </div>
      </div>
    </main>
  )
}
