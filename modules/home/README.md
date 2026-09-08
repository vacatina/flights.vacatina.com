# Homepage

`app/(main)/page.tsx` composes four independent sections in `ui/`:

- `hero-section.tsx`: existing flight form over a YouTube video background.
- `hero-video-background.tsx`: muted looping video and motion preference handling.
- `popular-flights-section.tsx`: four destination cards, with a loading skeleton.
- `travel-services-section.tsx`: search, visa enquiry, and booking lookup links.
- `travel-confidence-section.tsx`: compact supporting benefits.

## Destination data

Edit the four destinations and their imagery in `domain/destinations.ts`.
Links use the existing validated search-prefill token. Each starts a one-adult,
one-way economy search from Colombo with an editable date 30 days ahead.
Selecting a destination fills the form; the traveller submits the search.

`server/popular-flights.ts` caches ranking for an hour. With a live Duffel key,
it aggregates paid bookings over the past 30 days for these four featured routes.
Each route needs at least three bookings before the complete selection is labelled
popular. Missing data, test keys, or database failures show editorial inspiration
instead. No personal data or historical booking prices reach the cards.

Live fare previews are not implemented. Cards lead to search for current prices.
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

Images are generated illustrations saved in `public/img/destinations/` as optimized
800px WebP assets. Generated with the built-in image tool, one image per prompt:

> Use case: photorealistic-natural. A single landscape destination photograph for
> a clean Vacatina travel website route card. Subject: [subject below]. Refined
> natural travel editorial photography, realistic recognizable landmarks,
> balanced muted blues with gentle warm sunlight. Wide 3:2 composition, main
> landmark centered safe for cropping, no text, no letters, no logos, no
> watermarks, no borders, no collage. Output a single image.

- Dubai skyline with Burj Khalifa reflected in water, soft golden morning.
- London Tower Bridge over the Thames, pale blue sky and warm afternoon light.
- Singapore Marina Bay with skyline and waterfront greenery, soft blue morning light.
- Bangkok Wat Arun temple beside Chao Phraya river, warm morning light.
