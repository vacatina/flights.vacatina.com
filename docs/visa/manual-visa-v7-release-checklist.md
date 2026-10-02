# Manual Visa V7 — Phase 5 Release Verification

Date: 30 September 2026.

Pricing amendment, 2 October 2026: the catalog and frozen requests now use one
price per traveler. Migration `0014_visa_single_price` replaces the fee split.
See [development seed](./manual-visa-development-seed.md) for the three sample
routes, safe reruns, and recoverable test-data cleanup. Verification below is
the original Phase 5 record, not the October 2 validation report.

## Scope and runtime contract

The database catalog is the only active source. Admins publish selected
passport-country/destination/visa-type combinations with descriptions, final
price per traveler, and an ordered document checklist.
The checklist can be required/optional and per traveler/once per request.

Drafts freeze the listing, checklist, currency, and exact unit fees. Changing
traveler count multiplies those frozen fees; catalog edits and unpublishing do
not change an existing request. Global currency conversion is display-only.
There is no payment, API fallback, markup-rule application, OCR, provider
redirect, or government submission.

Original API and markup modules remain in the repository. Active visa routes,
their layouts, and the public UI barrel have a transitive runtime-import
regression test that rejects imports from those modules. Type-only legacy
references do not activate the provider.

## Phase 5 changes

- Removed the obsolete provider checkout form and legacy detail barrel export.
- Centralized editable-page loading across all five checkout steps. Submitted
  requests go to confirmation, including records with a submitted timestamp.
- Prevented admin updates from reopening submitted requests as drafts, with a
  conditional database write and matching status choices.
- Step saves/submission now show retryable transport errors without clearing
  entered values. Next.js navigation signals still propagate.
- Available form navigation uses real links styled with shadcn button variants.
  Busy/unavailable actions use disabled buttons. Future progress steps are
  non-focusable text instead of links disabled only by CSS.
- Marked the original application plan and API reference as historical.

Existing responsive grids, shared flags, design tokens, loading boundaries,
publish feedback, flight-progress start button, and upload progress/retry
controls were reviewed in source. DOM tests check disabled navigation and
document gates. This is not browser or visual acceptance.

## Automated verification

- [x] Visa/currency regression suite: 109 passed; two database tests opt in.
- [x] TypeScript: `pnpm exec tsc --noEmit`.
- [x] ESLint for visa catalog, applications, retained UI, tests, and active routes.
- [x] Production build: `pnpm build`.
- [x] PostgreSQL catalog lifecycle; fixture transaction rolled back.
- [x] Expanded PostgreSQL application lifecycle; passed in approximately
  154 seconds and rolled back all fixtures.
- [x] Runtime dependency guard: active visa graph does not reach API/markup code.
- [x] Required/shared/optional documents, upload failure, retry, replacement,
  deletion, ownership/scope guards, and read-only step regressions.

The application database test covers admin repository publication, public
search/detail, draft creation, frozen fees/checklist after catalog changes,
two travelers, three verified required slots, rejected invalid slots and file
metadata, replacement/deletion retry, consent submission, customer/admin reads,
duplicate submission rejection, and submitted-to-draft rejection. A fetch spy
checks that the journey makes no external fetch. R2 signing/HEAD/deletion and
notification enqueue are mocked. Admin access guards have separate unit tests;
the database test is not an authenticated browser test.

### Repeatable commands

Run the focused suite without external services:

```sh
pnpm exec vitest run modules/visa-assistance modules/currency --maxWorkers=4
pnpm exec tsc --noEmit
pnpm exec eslint modules/visa-assistance/catalog modules/visa-assistance/applications modules/visa-assistance/testing modules/visa-assistance/ui app/visa-assistance app/admin/visa-listings app/admin/visa-applications app/admin/visa-pricing 'app/(main)/visa-requests' app/api/visa-applications
pnpm build
```

For database integration, set `VISA_CATALOG_TEST_DATABASE_URL` to an explicitly
selected migrated development/test database, then run:

```sh
pnpm exec vitest run modules/visa-assistance/catalog/server/repository.integration.test.ts modules/visa-assistance/applications/server/application-lifecycle.integration.test.ts --maxWorkers=2
```

These tests insert fixtures inside an outer transaction and deliberately roll
it back. They never require a reset or retain published demo records. The
application lifecycle has a 240-second timeout for remote database latency.
Do not run integration tests against a production database.

### Unrelated checks and warnings

The repository-wide test run had 376 passing tests, two opt-in database skips,
and two failures outside the visa work:

- `scripts/payment-stress.test.ts`: expected 40 terminal failures and zero
  invariant failures; observed zero terminal failures and 40 invariant failures.
- `scripts/payment-staging-topology.test.ts`: correctly refused external
  staging work because the explicit staging flag and required variables were
  absent. No staging payment tasks were created.

Those scripts/payment implementation files were not changed in Phase 5.
The full repository suite is therefore not claimed green.

The build retains the existing Google Sans Flex fallback-font warning.
The PostgreSQL driver warns about future SSL-mode semantics; no connection
policy or dependency versions were changed as part of this feature.
The shared-transaction integration run also emitted the driver's future pg 9
concurrent-query deprecation warning; the current queries completed successfully.

## Deployment and live-service checks still open

Browser testing was skipped at the owner's request. Do not treat these open
items as completed acceptance:

- [ ] Authenticated admin publish/edit/duplicate/unpublish and non-admin denial.
- [ ] Customer search → draft → two-traveler uploads → review → submit →
  customer/admin dashboards in the deployed application.
- [ ] Mobile layout, keyboard focus, dark mode, slow connections, and sign-in
  return to the selected listing.
- [ ] Real R2 PUT, HEAD, replacement/removal, and signed download. Verify bucket
  CORS includes the actual frontend origin, PUT, and Content-Type; the example
  `r2-cors.example.json` is not proof of deployed configuration.
- [ ] Private document access: another customer cannot obtain download URLs.
- [ ] Submission notification delivery and deployed worker configuration.

Before exposing the feature, ensure catalog/application migrations are applied,
active-admin access and Clerk are configured, R2 credentials/CORS are deployed,
and at least one complete reviewed listing is intentionally published. An empty
catalog correctly displays “not offered”; it does not fall back to an API.

## Data safety

Phase 5 made no schema reset and did not delete R2 objects. The previously
approved Phase 4 visa-only migration archived six applications, eight travelers,
nine documents, and 37 events in private schema
`visa_dev_backup_20260930`. Catalog, users, flights, payments, and R2 objects
were preserved. Keep that archive private; it contains personal information.
It is a development recovery snapshot, not a production migration strategy.
