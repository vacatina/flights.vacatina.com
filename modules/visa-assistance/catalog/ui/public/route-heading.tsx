import { VisaPhotoHero } from "@/modules/visa-assistance/ui/visa-photo-hero"
import { VisaRouteTicket } from "./route-ticket"

export function VisaRouteHeading({
  nationality,
  destination,
  title,
  description,
}: {
  nationality: string
  destination: string
  title: string
  description: string
}) {
  return (
    <header>
      <VisaPhotoHero
        title={title}
        description={description}
        image="/img/visa-assistance-travel.png"
        alt="Passport and travel documents in an airport lounge"
      />
      <div className="relative mx-auto -mt-8 w-full max-w-screen-2xl px-5 sm:px-8">
        <VisaRouteTicket nationality={nationality} destination={destination} />
      </div>
    </header>
  )
}
