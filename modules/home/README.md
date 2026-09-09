# Homepage

`app/(main)/page.tsx` composes five independent sections in `ui/`:

- `hero-section.tsx`: existing flight form over a YouTube video background.
- `hero-video-background.tsx`: muted looping video and motion preference handling.
- `popular-destinations-section.tsx`: four visual destination cards, with a loading skeleton.
- `popular-flights-section.tsx`: four compact live-offer cards, with a loading skeleton.
- `travel-services-section.tsx`: search, visa enquiry, and booking lookup links.
- `travel-confidence-section.tsx`: compact supporting benefits.

## Popular flight offers

`server/popular-destinations.ts` ranks recent paid routes when enough live booking
data exists. Otherwise, it keeps the four editorial destinations from
`domain/destinations.ts`. Their links prefill the existing flight-search form.

`server/popular-flights.ts` creates a one-adult, one-way economy search from
Colombo to Dubai, 30 days ahead. It runs the response through the same offer
normalization, pricing, airline-logo, and sorting pipeline as the results page.
The four homepage cards reuse `FlightResultSummary`; each selected offer continues
directly to review. The section uses a horizontal scroll-snap row to preserve the
marketing-page rhythm. Results are cached for three minutes to limit supplier
traffic without retaining stale fares. When Duffel is unavailable, the section
shows an honest search CTA instead of invented schedule or price data.

The fallback link uses the validated search-prefill token from
`domain/destinations.ts`, so the date and traveller can still be edited.
Visa assistance uses the configured contact email because this checkout has no
visa-assistance route. Replace this link when that flow is available here.

## Visual direction

Taste skill: preserve the brand; design variance 5, motion 3, density 3.
Existing sans typography, navy accents, light surfaces, 16px image/panel corners,
and reduced-motion-aware hover feedback. The original header and footer remain
shared. New sections support the existing `.dark` semantic tokens.

The hero uses YouTube video `bSBRo4Hnfak` through the privacy-enhanced embed
domain. It is decorative, muted, looping, keyboard-inert, and covered by the
existing readability overlay. The original hero photograph remains underneath
while the player loads and becomes the complete fallback when the visitor has
reduced motion enabled.

The compact card treatment follows the supplied results-card reference: real
airline identity and itinerary hierarchy first, then a quiet price row and one
clear action. It deliberately omits the expandable timeline and filters from the
full results experience.
