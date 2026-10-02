# Holiday packages UI

Public routes: `/holiday-packages` and `/holiday-packages/[slug]`.

This is a frontend preview using the supplied 24 holiday packages and eight categories. It has no database, admin panel, API, enquiry storage, or email integration. The enquiry form validates required fields and shows an explicit preview acknowledgement.

- `domain/`: package interfaces, pure filtering/formatting helpers, content access.
- `data/`: copied typed seed packages, categories, portable JSON, parsed long-form sections, original photo manifest, and original-filename-to-public-asset mapping.
- `content/`: original supplied long-form Markdown, retained for authoring.
- `ui/`: small presentational and interactive components.
- `public/media/holidays/`: 100 supplied photos/maps, resized to at most 1920px and encoded as WebP. Original filenames remain in package metadata and `data/media.json` maps them to web assets.

Layout follows the screenshots in `holiday-pkgs-design-inspiration`, with the existing Vacatina font, semantic colors, header, logo, and footer. Prices, durations, route stops and commercial notes come from the seed data; ratings and group limits are not invented.

The long-form `data/content.json` is generated from `content/holidays/*.md`, splitting on level-two headings into `{ title, body }` sections. After editing Markdown, run `node scripts/prepare-holiday-content.mjs` and update the corresponding typed seed fields. Itinerary and FAQ subsections are rendered as accessible shadcn accordions. Local filtering combines category, duration and activity level.
