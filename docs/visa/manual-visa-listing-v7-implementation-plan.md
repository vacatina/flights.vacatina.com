# Manual Visa Listing V7 — Implementation Plan

## Goal

Make Vacatina's database the only active source for visa listings. An admin
creates the passport-country/destination/visa-type combinations Vacatina wants
to offer, enters their descriptions and final customer prices, and configures
the documents needed for each listing. Customers search those published
listings, complete the existing visa-request flow, and upload the configured
documents through signed R2 URLs.

This is a development-stage refactor. There is no requirement to migrate old
visa catalog, pricing-rule, or draft-application data into the new model.
Keep the existing visa API client and markup-rule code in the repository, but
disconnect them from the active customer and admin flows. Database misses must
never trigger an API request or be described as "visa not required."

No payments, AI, OCR, provider redirect, or government submission are part of
this work.

## Product contract

1. One **visa listing** represents one passport country + destination + visa
   type. Multiple visa types for the same country pair are separate listings.
2. Admins create only the combinations Vacatina supports. A listing is either
   `draft` or `published`; only published listings appear to customers.
3. Prices are final, customer-facing **per-traveler estimates** entered by the
   admin: government fee and Vacatina processing fee, both in one currency.
   Zero is valid. There is no markup calculation in this flow. The displayed
   request estimate is `(government fee + processing fee) × traveler count`.
   The draft freezes the unit fees; changing the draft's traveler count
   recalculates its total from those frozen unit fees.
4. Each listing owns an ordered document checklist. Every item has a label,
   optional instructions, a required/optional flag, and a scope: **each
   traveler** or **once per request**. Initially, one uploaded file satisfies
   one checklist item for its scope. An explicitly reviewed empty checklist
   is allowed when no documents are needed.
5. At draft creation, freeze the listing's customer-facing summary, fees,
   currency, and document checklist on the application. Changes to a listing
   affect new applications only. An unpublished listing remains readable by
   people who already started a request.
6. Upload and submission authorization stays server-side. A file counts only
   after the existing R2 completion check confirms the object.
7. An unlisted or unpublished country pair means **not offered by Vacatina**.
   It does not establish whether a visa is legally required.

## Data model

Use two catalog tables and adapt the existing application/upload tables. Do
not create a route table, generic field-builder, provider registry, or
country-combination generator.

### `visa_listings`

- `id`: stable internal ID; never use an editable title as the identifier.
- `nationality_code`, `destination_code`: ISO two-letter country codes.
- `code`: short admin-controlled code that distinguishes visa types on the
  same route; unique with the two country codes.
- `title`, `short_summary`, `full_description`: public copy.
- `eligibility_notes`, `processing_time_text`, `validity_text`,
  `max_stay_text`, `entries_text`, `passport_validity_text`,
  `additional_notes`: optional structured copy shown only when provided.
- `fee_currency`, `government_fee_minor`, `processing_fee_minor`: exact money
  values in the listing currency. Use the existing currency registry to
  validate precision and convert admin-entered decimal text to integer minor
  units. No floating-point money arithmetic.
- `status`, `published_at`, `reviewed_at`, `created_at`, `updated_at`,
  `created_by`, `updated_by`.

Add a unique constraint on `(nationality_code, destination_code, code)`, a
public search index on `(status, nationality_code, destination_code)`, and
basic checks for valid country codes, distinct countries, nonnegative fees,
and supported status values. A listing can be unpublished but should not be
hard-deleted while applications reference it.

### `visa_listing_documents`

- `id`, `listing_id`, `label`, `instructions`, `required`, `scope`,
  `sort_order`, `created_at`, `updated_at`.
- `scope` is `per_traveler` or `per_application`.
- Ordering is unique within a listing. Use stable IDs so reordering does not
  change what a saved application checklist refers to.
- MIME types and the file-size limit remain shared system constants for V7
  (PDF, JPG, PNG; currently 10 MB). Admins do not configure file types.

### Applications and uploaded files

- Replace `visa_type_id`/`provider_product_id` selection with `listing_id`.
- Store a typed `listing_snapshot` JSONB value containing the displayed visa
  details, fee breakdown, currency, and document checklist captured when the
  draft is created. Validate it with Zod when writing and reading.
- Keep the existing application reference, owner, trip/traveler/contact,
  status, event, and notification concepts.
- Replace the fixed `visa_document_type` enum on uploads with
  `requirement_id` from the application's snapshot. Allow `traveler_id` to be
  null only for a `per_application` requirement.
- Uploaded files continue to store their R2 object key, MIME type, size,
  status, and timestamps. Do not put R2 URLs in the database.
- Keep a snapshot of the estimated fee breakdown on the application; it does
  not contain markup or applied-rule fields.

Because legacy visa data does not need preservation, make one explicit,
reviewed visa-only development migration/reset path. It must not touch flight,
hotel, payment, user, or unrelated admin records. Document what the migration
resets before running it in any shared environment.

**Phase 1 migration decision:** `0011_manual_visa_listings.sql` is additive:
it creates the two catalog tables and leaves the active legacy application,
API, and pricing-rule data untouched while customers still use that journey.
Before Phase 4 switches application foreign keys and document slots, use a
separate reviewed, visa-only development reset. That reset may clear legacy
`visa_application_*` rows (including uploads and events) and replace their
schema, but must not delete `users`, flights, payments, or unrelated records.
Do not run that reset in a shared environment without confirming the exact
visa rows and R2 objects to discard. Catalog listings created in Phase 1
must be preserved by the later reset.

## Admin experience

Add **Visa Listings** to the existing admin navigation. Keep **Visa Requests**.
Remove **Visa Pricing** from active navigation and prevent its old route from
being used as a parallel source of prices; retain the old implementation files.

### Listing page: `/admin/visa-listings`

- Table with passport country, destination, visa type, status, final per-person
  estimate, document count, last updated/reviewed, and actions.
- Search by country or title; filter by status. Paginate on the server.
- Clear `Create visa listing` action, draft/published badges, and helpful empty
  state. A draft is never silently published.
- Duplicate an existing listing into a new draft to make similar visa types
  quick to enter; require a new unique code and show the copied fields.

### Editor: `/admin/visa-listings/new` and `/admin/visa-listings/[id]`

Use one page with four short sections instead of a large wizard:

1. **Route and visa** — passport country, destination, internal code, public
   title, and short summary.
2. **Visa details** — full description plus optional eligibility, processing,
   validity, stay, entries, passport, and additional notes. Use labeled
   multiline inputs with examples and length guidance. Plain text is enough
   for V7; no rich-text editor or HTML input.
3. **Estimated fees** — currency, government fee, Vacatina processing fee,
   and a live per-traveler total. Show that prices are final entered values.
4. **Required documents** — an editable ordered list of rows. Each row has
   label, instructions, required toggle, and scope selector. Provide add,
   remove, and reorder controls. Show a small customer-view preview per row.

Use the installed shadcn components, React Hook Form field arrays, and shared
Zod schemas. Save as draft with pending/success/error feedback and preserve
entered values on validation errors. Publishing is a separate action with a
compact checklist of missing fields. Provide an actual customer preview
before publishing. The published record remains editable, with a clear note
that changes apply to new applications only.

Publishing requires valid route and type identity, a public title and
summary, a full description, valid fee currency and both fee values, and an
explicit admin confirmation that the document checklist is complete. No
particular document is universally required. Publishing sets `reviewed_at`;
an admin can update it when they review requirements again.

All writes require the existing active-admin guard. Save the listing and its
document rows in one database transaction. On conflict, report the duplicate
country-pair/type clearly. Show the actor and update time to admins; retain a
small audit event for create, update, publish, and unpublish.

## Customer experience and data flow

```text
Admin publishes listing
        ↓
Public search reads published DB listings
        ↓
Customer opens listing and creates application draft
        ↓
Draft freezes listing details, price, and document checklist
        ↓
Checkout renders that checklist and uploads to R2
        ↓
Server checks every required slot, then accepts submission
```

The landing search keeps its current two-country UI. The result route reads
published listings for that pair directly from the database. Show all matching
visa types as separate cards. A missing pair gets a clear no-listing page with
a way to search again; never show the existing "visa not required" outcome.
Direct URLs must enforce the same publication filter as search.

Use a small server-only catalog repository (for example,
`listPublishedVisaListings`, `getPublishedVisaListing`, and admin CRUD
functions). The application service consumes this repository. Do not route
the database call through the iVisa response types or build a provider
fallback abstraction for one active source. Keep the API client modules
present but remove their imports from active pages/services.

Public detail UI should display admin-authored descriptions, visa facts,
documents, and the two final fee components. Keep the existing global
display-currency selector as display-only FX; store and snapshot the source
currency and exact source amount. Replace "Checked just now" with the
listing's `reviewed_at` date and keep the existing reminder to verify official
requirements. Remove provider and markup wording from customer copy.

## Dynamic document flow

The checkout document page loads requirements from the application's
`listing_snapshot`, never from the latest catalog row. For `per_traveler`
items, render one upload slot per traveler; for `per_application` items,
render one shared slot. Required and optional states, labels, instructions,
and completion indicators come from the snapshot. Show only configured
items, with no hard-coded passport/photo/ID list. If the checklist is empty,
show a short "No documents needed for this request" state and let the
customer continue.

The upload-intent action accepts `requirementId` and an optional `travelerId`.
Before signing a URL, the server verifies application ownership and editable
status, finds the requirement in the saved snapshot, checks its scope and
traveler ownership, and enforces shared MIME/size limits. Completion still
verifies the R2 object with `HEAD`. Replacement or deletion must immediately
update the visible slot state. Do not allow a customer to satisfy a required
slot with a file labeled as another requirement.

One shared `getMissingRequiredDocuments(application)` domain function should
drive the upload-step Continue button, dashboard resume step, review summary,
and final server submission guard. It must check uploaded status, not just
file metadata. Optional missing items never block submission. Submission
must recheck requirements after the final upload and remain safe against a
double submit.

## Phases and review gates

### Implementation checkpoint — 30 September 2026

- Phase 1 catalog foundation and Phase 2 admin code are implemented.
- Migration `0011_manual_visa_listings` adds the catalog. Migration
  `0012_visa_listing_audit` adds its audit history. Both are applied to the
  configured database; existing visa applications are preserved.
- Admins use `/admin/visa-listings`, `/admin/visa-listings/new`, and
  `/admin/visa-listings/[listingId]`. The editor uses the installed Base UI
  shadcn components, React Hook Form, and shared Zod validation.
- The editor supports descriptions, exact fees, a live total, ordered
  required/optional documents of either scope, draft saves, customer preview,
  atomic save-and-publish, duplication with new document IDs, and unpublishing.
  Document edits clear the review confirmation. Published edits require a
  complete listing and a reviewed checklist.
- Visa Listings replaces Visa Pricing in admin navigation. The retired
  pricing routes redirect to listings, and their active write actions are
  disabled. Original page/action implementations are retained in
  `modules/visa-assistance/pricing/**/legacy-*`; API and markup code remains.
- Validation includes catalog domain tests, admin action/read guards,
  document reorder tests, and an opt-in PostgreSQL lifecycle test. The
  database test wraps all fixtures and publications in a transaction that
  rolls back. Set `VISA_CATALOG_TEST_DATABASE_URL` to a migrated test database
  to run `pnpm exec vitest run
modules/visa-assistance/catalog/server/repository.integration.test.ts`.
- TypeScript, focused lint, regression tests, and production build are the
  code verification gates. Browser/authenticated visual acceptance is not
  claimed; browser testing was omitted at the user's request.
- Next is Phase 3: public search and details read published database listings.
  Checkout snapshot selection and dynamic document uploads remain Phase 4.

### Phase 1 — Catalog foundation

**Build:** Define the V7 Zod/domain types and Drizzle tables; add migration,
catalog repository, exact-money helpers, and service-level tests. Keep the
current customer flow untouched during this phase. Decide and document the
visa-only development data reset before applying the migration.

**Gate:** A draft listing with ordered document requirements can be created,
read, edited, and published through server functions. Duplicate combinations
are rejected. Published queries return only published rows. No API request is
made by the new repository. Migration and database checks pass.

### Phase 2 — Admin listing and editor

**Build:** Add the list, create/edit pages, document field array, publish
checklist, preview, duplicate action, loading states, and audit events. Add
Visa Listings navigation; retire the active Visa Pricing entry and route.

**Gate:** An admin can enter a complete listing, configure required and
optional documents of both scopes, save a draft, preview it, publish it,
reopen it, edit it, duplicate it, and unpublish it without touching SQL. A
non-admin cannot read draft details or mutate the catalog. Errors do not
discard form input.

### Phase 3 — Database-backed public search and details

**Build:** Switch search results and detail pages to published catalog rows.
Render multiple visa types for one country pair, admin-authored copy and
document overview, final fee components, and reviewed date. Remove calls to
the active API/fallback/markup pipeline from these routes. Keep old modules
in the repository.

**Gate:** A published listing appears in search and opens correctly; drafts
and unpublished listings do not. Missing combinations show "not offered"
messaging. Public search causes no visa API calls. Prices match the admin
values before display-currency conversion.

### Phase 4 — Application selection, price snapshot, and dynamic uploads

**Build:** Create drafts from a stable listing ID and freeze the listing
snapshot. Refactor application pricing to direct fees and traveler count.
Replace the hard-coded document enum/options and passport-only guards with
snapshot requirements across UI, upload actions, dashboard resume, review,
admin request detail, and submission. Keep R2 signed URL and completion
checks.

**Gate:** For a test listing with one per-traveler document and one shared
document, two travelers see three required upload slots. Submission is
blocked until all three are verified uploaded. Optional files do not block.
Changing or unpublishing the source listing does not alter an existing draft.
The reviewed estimate and submitted snapshot stay stable. No payment step is
introduced.

### Phase 5 — Integration cleanup and release verification

**Build:** Remove active imports, copy, and navigation that imply API sourcing
or markup pricing. Keep API and rule modules available in the codebase but
unreachable from the active visa journey. Update tests and the existing
Phase 1 documentation where its assumptions are superseded. Review mobile
layouts, admin form usability, loading/error states, and document retry flow.

**Gate:** Typecheck, lint, focused unit/integration tests, and production
build pass. A manual end-to-end check covers admin publish → public search →
draft → multi-traveler uploads → review → submission → customer/admin
dashboards. Confirm from instrumentation or mocked fetch that the journey
makes no visa API requests and applies no pricing rule. Record any unrelated
pre-existing failures separately.

## Test cases that matter

- Multiple visa types on one country pair, and no row for another pair.
- Duplicate route/type code, incomplete publish attempt, and unpublish after
  an application has started.
- Zero-valued fees, nonzero fees, currency precision, two-traveler totals,
  and display-only FX changes.
- Required and optional documents at both scopes; upload failure, retry,
  replacement, deletion, and cross-application requirement/traveler IDs.
- Admin edits a document checklist while a customer has an open draft.
- Customer changes traveler count before uploads and sees the correct new
  per-traveler slots.
- Review and final submission both enforce the same checklist, including
  double-submit and direct action calls that skip the UI.

## Explicitly deferred

Payments, government submission, API fallback, automatic import/sync,
AI/OCR, conditional questionnaires, document-specific MIME rules, different
prices by traveler age or processing speed, and custom rich-text editing.
Those can be added later only when the product needs them.
