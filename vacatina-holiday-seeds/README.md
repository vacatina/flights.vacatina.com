# Vacatina Holiday Seed Package

Ready-to-use static seed content for prototyping the Vacatina holiday-package UI/UX in Next.js.

## Included

- **24 holiday packages** as individual typed TypeScript modules.
- One aggregate `holidayPackages` export and helper lookups.
- A portable JSON copy of the complete normalized package dataset.
- **8 holiday categories** in TypeScript and JSON.
- Full long-form Markdown content for every holiday package.
- Category Markdown content.
- Media filenames/roles/alt text from the supplied dataset.
- TypeScript interfaces for the frontend domain model.

Internal scraping/provenance/editorial/SEO/AEO fields were intentionally removed from the frontend seed objects. Customer-facing details were retained. `source_facts` was renamed to `description` inside itinerary days. References to the previous site name in customer-facing Markdown were changed to **Vacatina**.

## Important media note

The uploaded archive contains media **references and a manifest**, but not the actual image binaries under `media/photos/`. Therefore this package preserves each image filename, role, and alt text but cannot include the photographs themselves. See `media-reference/photos-manifest.json` for the supplied manifest.

## Suggested placement

Copy `src/` into your Next.js project, or adapt the paths to your existing structure.

```text
src/
  types/holiday.ts
  data/holidays/
    index.ts
    categories.ts
    packages/*.ts
    json/*.json
  content/
    holidays/*.md
    holiday-categories/*.md
```

## Basic usage

```tsx
import { holidayPackages, getHolidayBySlug } from "@/data/holidays";

export default function HolidaysPage() {
  return (
    <div>
      {holidayPackages.map((holiday) => (
        <article key={holiday.id}>
          <h2>{holiday.title}</h2>
          <p>{holiday.summary}</p>
          <p>{holiday.duration.days} days / {holiday.duration.nights} nights</p>
        </article>
      ))}
    </div>
  );
}
```

## Dynamic route example

```tsx
import { getHolidayBySlug } from "@/data/holidays";
import { notFound } from "next/navigation";

export default async function HolidayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const holiday = getHolidayBySlug(slug);

  if (!holiday) notFound();

  return <HolidayDetails holiday={holiday} />;
}
```

## Markdown

`contentFile` points to the source Markdown file for the tour. How you render it is up to the app (for example `gray-matter` + `remark`, MDX, Contentlayer-like tooling, or a small server-side loader). The TypeScript data is intentionally independent of any particular Markdown library.

## UI surfaces this dataset can support

- Holiday listing/grid
- Category filters
- Duration/activity filters
- Package cards
- Holiday hero and gallery
- Route overview
- Full daily itinerary / accordion
- Inclusions and exclusions
- Season guidance
- Best-for tags
- Map image slot
- Long-form article sections
- Enquiry CTA
- Related-package recommendations by category

## Prototype-only commercial data

Prices are on-request in the supplied seed content. Hotel names/classes, meal plans, entry fees, optional activities and final commercial inclusions should be confirmed before a production launch.
