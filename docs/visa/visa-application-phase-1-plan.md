# Visa Application Phase 1 Implementation Plan

> **Historical plan — superseded by Manual Visa Listing V7.**
> Follow [the V7 plan](manual-visa-listing-v7-implementation-plan.md) for active
> implementation and [release verification](manual-visa-v7-release-checklist.md)
> for outstanding checks. The API-backed selection, markup rules, fixed document
> types, and live price refresh described below are no longer active.
> Current requests use published database listings, final admin-entered unit
> fees, and a frozen listing/document checklist. Documents are configured per
> listing and uploaded per traveler or once per request. No payment is collected.
> This file is retained to explain the original implementation, not to define
> current behavior.

## 1. Objective

Build a Vacatina-owned visa request flow that collects the information and
documents required for the operations team to review a request.

Phase 1 will:

- collect trip, traveler, passport, contact, and document information;
- display estimated government and Vacatina processing fees;
- apply the existing admin-managed visa pricing rules;
- respect the existing global display-currency selector;
- upload private documents directly to Cloudflare R2 with signed URLs;
- create an admin-reviewable visa request;
- send submission notifications; and
- preserve clean extension points for a future payment phase.

Phase 1 will not:

- collect card or bank details;
- create payment attempts or checkout sessions;
- redirect customers to iVisa;
- expose iVisa branding or internal provider identifiers;
- submit an application to an immigration authority;
- use AI, OCR, or passport auto-reading; or
- introduce country-specific questionnaires beyond the agreed basic fields.

## 2. Customer Journey

The customer journey must remain short and predictable:

1. Select an eligible visa option.
2. Enter trip details.
3. Enter traveler and passport details.
4. Enter contact details.
5. Upload documents.
6. Review the estimated price and information.
7. Submit the visa request.
8. Receive a Vacatina reference number and wait for team contact.

The form should use one shared application shell with a visible step indicator,
a persistent estimated-price summary on desktop, and a compact summary on
mobile.

### Step 1: Trip details

Read-only context:

- passport country;
- destination country; and
- selected visa type.

Customer input:

- expected entry date; and
- number of travelers.

### Step 2: Traveler details

Collect the following for every traveler:

- title;
- first name;
- last name;
- nationality;
- date of birth;
- passport number; and
- passport expiry date.

The UI should show one clear traveler section per traveler. Traveler sections
may be collapsible after validation, but the currently edited traveler must
remain expanded.

### Step 3: Contact details

Collect:

- email address; and
- mobile number with country code.

Prefill the signed-in user's email when it is available, while allowing the
customer to provide a different contact email for the request.

### Step 4: Document uploads

For each traveler, support:

- passport bio page, required;
- passport-size photo, optional;
- national ID front, optional;
- national ID back, optional; and
- additional documents, optional and repeatable.

Supported initial formats:

- PDF;
- JPEG; and
- PNG.

The initial maximum file size should be 10 MB per file and should be held in a
single domain constant so it can be changed without touching UI components.

### Step 5: Review and submit

Show editable summaries for:

- trip details;
- travelers;
- contact details;
- uploaded documents; and
- estimated pricing.

Require explicit, unchecked acceptance of:

- information accuracy;
- terms and conditions; and
- privacy and document-processing consent.

The final action is **Submit visa request**. There must be no payment action.

### Confirmation

After submission, show:

- the Vacatina visa-request reference;
- submission date;
- selected visa and travelers;
- the submitted estimated price;
- confirmation that no payment was taken; and
- a clear explanation that the operations team will make contact.

## 3. Application and Route Design

Keep the existing public visa-search and results routes. Add a
**Start visa request** action to eligible visa-option cards.

Recommended routes:

```text
/visa-assistance/applications/[applicationId]/trip
/visa-assistance/applications/[applicationId]/travelers
/visa-assistance/applications/[applicationId]/contact
/visa-assistance/applications/[applicationId]/documents
/visa-assistance/applications/[applicationId]/review
/visa-assistance/applications/[applicationId]/confirmation

/admin/visa-applications
/admin/visa-applications/[applicationId]
```

Use a shared layout for the customer application routes. Each route must load
the application on the server, verify ownership, and pass serializable data to
the interactive client form.

The initial implementation should require Clerk authentication before creating
a draft. This keeps document ownership and resume behavior simple and secure.
The existing guest-session model can support a future guest application flow,
but it is not required for Phase 1.

## 4. Frontend Architecture

Use:

- shadcn/ui for form controls and feedback components;
- React Hook Form for client-side form state;
- Zod for shared validation schemas;
- Server Actions for authenticated application mutations; and
- server components for initial data loading and authorization.

### shadcn/ui composition

Use existing project components before adding new ones. The current project
already includes the core field, input, select, button, card, alert, skeleton,
spinner, and related components.

Use the shadcn CLI with `--dry-run` and `--diff` before adding the missing
`checkbox` and `progress` components.

Form layout must use:

- `FieldGroup` and `Field` for structure;
- `FieldLabel`, `FieldDescription`, and `FieldError` for field content;
- `data-invalid` on invalid fields;
- `aria-invalid` on invalid controls;
- `Card` composition for traveler and document sections;
- `Alert` for page-level failures and pricing notices;
- `Progress` for application and file-upload progress;
- `Spinner` inside pending buttons;
- `Skeleton` for route-level loading; and
- `Checkbox` for final consent fields.

Use semantic design tokens and existing component variants. Custom classes
should control layout only. Use `gap-*` utilities instead of `space-*`.

### React Hook Form and Zod

Create one Zod schema per step and compose them into a final submission schema.
Infer TypeScript form values from the schemas instead of maintaining duplicate
interfaces.

Recommended schemas:

```text
tripStepSchema
travelerSchema
travelersStepSchema
contactStepSchema
documentMetadataSchema
reviewConsentSchema
visaApplicationSubmissionSchema
```

Use `zodResolver` in each step. The server action must parse the same schema
again because client-side validation is not a security boundary.

Each step should save only its own fields. Avoid one large form component and
avoid sending the entire application on every save.

### Form behavior

Every step must provide:

- Save and continue;
- Back;
- pending button text and spinner;
- disabled controls while saving;
- inline validation;
- a page-level error fallback;
- route-level loading skeletons; and
- restoration from persisted server data after refresh.

Do not store passport data, contact information, or R2 URLs in local storage.

## 5. Cloudflare R2 Upload Architecture

Use a private R2 bucket through its S3-compatible API. Do not enable public
bucket access and do not expose R2 credentials to the browser.

Add:

```text
@aws-sdk/client-s3
@aws-sdk/s3-request-presigner
```

Create a server-only R2 client and a small storage interface so business logic
does not depend directly on the AWS SDK.

### Required server-only configuration

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

Validate these values in one server environment module. Never read them from a
client component or expose them with a `NEXT_PUBLIC_` prefix.

### Object-key format

Use opaque identifiers and avoid personal information or original filenames:

```text
visa-applications/{applicationId}/{travelerId}/{documentId}
```

Store the original filename only in PostgreSQL for display purposes.

### Upload sequence

1. The customer selects a file.
2. The browser validates the declared type and size for quick feedback.
3. `createVisaDocumentUploadIntent` verifies authentication, application
   ownership, draft status, traveler ownership, document type, MIME type, and
   declared size.
4. The server creates a document record with `pending_upload` status.
5. The server creates a five-minute signed `PutObject` URL for that exact R2
   object key and content type.
6. The browser uploads directly to R2 using the exact signed `Content-Type`.
7. An isolated upload client reports progress and supports retry.
8. `completeVisaDocumentUpload` performs `HeadObject` from the server.
9. The server verifies that the object exists and that its stored size and
   content type match the upload intent.
10. Invalid objects are deleted and the document record is marked failed.
11. Valid objects are marked `uploaded` and displayed in the form.

Use `XMLHttpRequest` only inside the isolated R2 upload transport when upload
progress is required. Keep it out of form and business components.

### Download sequence

1. A customer or admin requests a document.
2. The server verifies application ownership or active-admin access.
3. The server generates a short-lived signed `GetObject` URL.
4. The browser opens the signed URL.

Use a short expiry, such as 60 seconds, for sensitive document reads. Treat
signed URLs as bearer credentials and never store them in PostgreSQL, analytics,
emails, or logs.

### Delete sequence

Document deletion must be idempotent:

1. verify ownership and editable application status;
2. mark the database record as deletion pending;
3. delete the R2 object;
4. mark the record deleted; and
5. allow a retry if R2 deletion fails.

### R2 CORS

Configure bucket CORS for exact application origins. Include local development,
preview, and production origins through environment-specific configuration.

Allow only the required methods and headers:

```text
AllowedMethods: PUT, GET, HEAD
AllowedHeaders: Content-Type
ExposeHeaders: ETag
```

Do not use wildcard production origins. Refresh an expired upload URL instead
of trying to reuse it.

## 6. Pricing Behavior

Reuse the existing visa pricing service. Do not create a second markup or
currency implementation.

The summary must show:

- government fee;
- Vacatina processing fee, including the active markup;
- estimated total; and
- the selected global display currency.

Add the notice:

> This is an estimated price. No payment is required now. Our team will review
> your request and contact you with the confirmed amount.

Recalculate pricing when the draft is created and immediately before final
submission. If the amount changed, show the new estimate and require the
customer to confirm the review step again.

At submission, persist an immutable pricing snapshot. Store money as amount,
currency, and scale rather than floating-point numbers or PostgreSQL `money`.
The snapshot should preserve:

- processing source amount;
- processing markup amount;
- processing sell amount;
- government source amount;
- government markup amount, if configured;
- government sell amount;
- estimated total;
- applied rule identifiers;
- pricing timestamp; and
- source currency.

The global currency selector remains display-only. A future payment phase can
create a separately validated payable quote from the application snapshot.

## 7. Database Design

Add four relational tables with foreign-key indexes and database constraints.

### `visa_applications`

Core fields:

- `id`;
- `reference`;
- `owner_user_id`;
- `nationality_code`;
- `destination_code`;
- `visa_type_id`;
- `provider_product_id`;
- `entry_date`;
- `traveler_count`;
- `contact_email`;
- `contact_phone`;
- `status`;
- typed `pricing_snapshot` JSON;
- `submitted_at`;
- `created_at`; and
- `updated_at`.

Initial statuses:

```text
draft
submitted
under_review
needs_information
customer_contacted
closed
```

### `visa_application_travelers`

Core fields:

- `id`;
- `application_id`;
- `position`;
- `title`;
- `first_name`;
- `last_name`;
- `nationality_code`;
- `date_of_birth`;
- `passport_number`;
- `passport_expiry_date`;
- `created_at`; and
- `updated_at`.

Enforce a unique application and position pair.

### `visa_application_documents`

Core fields:

- `id`;
- `application_id`;
- `traveler_id`;
- `document_type`;
- `status`;
- `object_key`;
- `original_filename`;
- `mime_type`;
- `size_bytes`;
- `etag`;
- `uploaded_at`;
- `deleted_at`;
- `created_at`; and
- `updated_at`.

Document statuses:

```text
pending_upload
uploaded
upload_failed
deletion_pending
deleted
```

### `visa_application_events`

Append-only audit fields:

- `id`;
- `application_id`;
- `actor_user_id`;
- `event_type`;
- typed metadata JSON; and
- `created_at`.

Events should cover draft creation, step saves, document changes, submission,
status changes, and team contact.

Use a transaction for final submission so the validated application state,
pricing snapshot, submitted status, and submission event commit together.

## 8. Server Boundaries

Keep server code layered:

- actions authenticate and parse inputs;
- services enforce workflow and authorization rules;
- repositories perform Drizzle queries;
- the R2 adapter performs object-storage operations;
- pricing uses the existing pricing service; and
- notification adapters send customer and internal emails.

Do not access Drizzle or the AWS SDK from client components.

Recommended actions:

```text
createVisaApplicationDraft
saveVisaTripStep
saveVisaTravelersStep
saveVisaContactStep
createVisaDocumentUploadIntent
completeVisaDocumentUpload
deleteVisaDocument
submitVisaApplication
updateVisaApplicationStatus
```

All mutations must verify ownership or admin authorization on the server. Never
trust an application, traveler, document, price, status, or object key supplied
by the browser.

## 9. Admin Experience

Add **Visa Requests** as a separate admin navigation entry from **Visa Pricing**.

### Visa request list

Show:

- reference;
- customer;
- destination;
- visa type;
- traveler count;
- submitted estimate;
- status; and
- submission date.

Include server-side search, status filtering, pagination, loading skeletons, and
an empty state.

### Visa request detail

Show:

- trip summary;
- contact summary;
- one section per traveler;
- secure document actions;
- immutable pricing snapshot;
- status controls;
- internal notes; and
- activity history.

Opening a document must request a new authorized signed read URL. Do not render
permanent R2 URLs.

## 10. Notifications

Use the existing email infrastructure.

On submission:

- send the customer a confirmation with the reference and estimated price;
- state that no payment has been taken;
- notify the operations team with a link to the admin record; and
- exclude passport numbers, document links, and other sensitive details from
  email content.

Email delivery failure must not roll back a successfully submitted request.
Record notification failures for retry and operations visibility.

## 11. Recommended File Structure

Keep files small and focused. Avoid a single wizard file or a single service
that owns every concern.

```text
modules/visa-assistance/applications/
├── domain/
│   ├── application-schema.ts
│   ├── application-types.ts
│   ├── document-schema.ts
│   ├── pricing-snapshot.ts
│   ├── status.ts
│   └── constants.ts
├── server/
│   ├── actions/
│   │   ├── create-draft.ts
│   │   ├── save-contact.ts
│   │   ├── save-travelers.ts
│   │   ├── save-trip.ts
│   │   ├── submit-application.ts
│   │   └── update-status.ts
│   ├── documents/
│   │   ├── create-upload-intent.ts
│   │   ├── complete-upload.ts
│   │   ├── create-download-url.ts
│   │   └── delete-document.ts
│   ├── application-repository.ts
│   ├── application-service.ts
│   ├── authorization.ts
│   ├── notifications.ts
│   └── r2-storage.ts
├── ui/
│   ├── application-shell.tsx
│   ├── application-progress.tsx
│   ├── application-summary.tsx
│   ├── pending-navigation-button.tsx
│   ├── pricing-summary.tsx
│   ├── steps/
│   │   ├── contact-step.tsx
│   │   ├── documents-step.tsx
│   │   ├── review-step.tsx
│   │   ├── travelers-step.tsx
│   │   └── trip-step.tsx
│   └── uploads/
│       ├── document-upload-field.tsx
│       ├── document-upload-list.tsx
│       ├── upload-r2-object.ts
│       └── use-document-upload.ts
└── index.ts
```

Use local barrel files only at stable module boundaries. Internal files should
prefer direct imports to avoid circular dependencies.

## 12. Code Quality and Developer Experience

Follow these rules during implementation:

- keep the existing Prettier print width of 80 characters;
- do not write compressed one-line components, actions, or services;
- use descriptive domain names instead of abbreviations;
- avoid files that mix UI, database queries, validation, and storage logic;
- infer types from Zod and Drizzle where practical;
- use explicit return types on public service boundaries;
- use discriminated unions for action results and upload states;
- use typed JSON columns rather than untyped objects;
- avoid `any`, non-null assertions, and duplicated money types;
- keep server-only modules marked with `server-only`;
- keep client-component boundaries narrow;
- pass only serializable props from server to client components;
- centralize constants for document types, limits, routes, and statuses;
- use transactions for multi-table business mutations;
- create indexes for ownership, status queues, references, and foreign keys;
- log identifiers and workflow events without logging personal information; and
- add concise comments only where a business rule is not obvious from code.

## 13. Testing Plan

### Domain tests

- step validation;
- traveler-count consistency;
- passport-expiry validation;
- document type and size rules;
- status transitions;
- pricing snapshot serialization; and
- submission completeness.

### Service and repository tests

- user ownership enforcement;
- admin authorization;
- draft creation idempotency;
- per-step persistence;
- R2 object-key generation;
- upload completion verification;
- document deletion retries;
- immutable submitted pricing;
- atomic final submission; and
- duplicate-submit protection.

### UI tests

- step rendering and navigation;
- inline validation;
- multiple travelers;
- upload progress, retry, replace, and delete;
- pending button states;
- pricing display through the global currency context;
- review consent; and
- confirmation state.

### R2 integration checks

- signed PUT succeeds with an allowed content type;
- mismatched signed content type fails;
- expired URLs fail;
- CORS works for configured origins;
- unauthorized users cannot request read URLs;
- post-upload metadata verification works; and
- deleted objects can no longer be downloaded.

### Required project validation

```text
focused Vitest suites
TypeScript typecheck
targeted ESLint
Prettier check
git diff --check
production build
```

Browser automation is not required for Phase 1. Perform a focused manual smoke
check for upload, refresh/resume, submission, confirmation, and admin access.

## 14. Delivery Order

### Milestone 1: Foundation

- add schemas, types, statuses, and constants;
- add database tables and migration;
- add repository and authorization boundaries; and
- add test factories.

### Milestone 2: Draft and basic steps

- add Start visa request;
- create authenticated drafts;
- implement trip, traveler, and contact steps; and
- persist and resume server-side state.

### Milestone 3: R2 documents

- configure the private bucket and CORS;
- add the server-only R2 adapter;
- implement signed upload intents;
- implement progress, completion verification, read, and delete flows; and
- add document security tests.

### Milestone 4: Pricing and submission

- connect the existing visa-pricing output;
- add the estimated-price summary;
- persist the immutable pricing snapshot;
- implement final validation and transactional submission; and
- add confirmation notifications.

### Milestone 5: Admin operations

- add the Visa Requests queue;
- add the detail view and secure document access;
- add status transitions, notes, and audit history; and
- validate the full handoff from customer to operations.

### Milestone 6: Hardening

- complete tests and accessibility checks;
- verify logs contain no personal data or signed URLs;
- verify R2 lifecycle and retention settings;
- validate the production build; and
- document environment and deployment steps.

## 15. Definition of Done

Phase 1 is complete when:

- an eligible signed-in customer can create and resume a draft;
- all five steps save and validate correctly;
- each traveler can upload the required passport document to private R2;
- uploaded objects are verified before being accepted;
- customers and admins can access documents only through authorized,
  short-lived signed URLs;
- estimated pricing uses the existing markup and currency systems;
- the submitted pricing snapshot does not change with later rule updates;
- submission creates one immutable request and reference;
- the customer receives confirmation that no payment was taken;
- admins can search, review, and update visa requests;
- no iVisa branding or checkout behavior appears in the customer journey; and
- focused tests, typecheck, lint, formatting, diff checks, and production build
  pass.

## 16. Future Payment Phase

The future payment phase should create a payable quote linked to the submitted
visa application. It should not mutate the Phase 1 pricing snapshot or overload
visa-application statuses with payment state.

Keep payment attempts, payment events, refunds, and provider identifiers in the
payments domain. The Phase 1 application needs only a stable identifier and
pricing snapshot so payments can be connected later without redesigning the
information-gathering flow.
