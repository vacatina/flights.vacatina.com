# Manual visa development seed

The manual catalog uses one **price per traveler**, in the listing's currency.
There are no government/processing fee splits or runtime markup rules. Checkout
multiplies the frozen unit price by the traveler count; currency conversion is
display-only. Payment remains outside this flow.

## Included routes

| Passport | Destination | Tourism | Business |
| --- | --- | --- | --- |
| Sri Lanka | India | USD 75 | USD 110 |
| Sri Lanka | Singapore | USD 95 | USD 135 |
| Sri Lanka | United Arab Emirates | USD 145 | USD 195 |

Each route has separate `TOURIST` and `BUSINESS` listings with distinct stable
IDs, prices, descriptions, and checklists. Customers see both published options
in route search results. Admins can add more options using a different internal
code on the same passport/destination pair; no schema change is needed.

These are published **development samples**, not verified offers or immigration
requirements. Each contains descriptions, team-confirmed timing/validity copy,
eligibility notes, and a configurable document checklist. Passport and photo
uploads are required per traveler; itinerary is optional per request. Singapore
tourism also has an optional accommodation upload. Business options add a
required business invitation letter once per request, shared by all travelers.
These are sample requirements, not verified legal categories or permission to
work. Review all content and prices before production use.

## Run

Uses `DATABASE_URL` from `.env`. Run migrations first.

```sh
pnpm db:seed:visa
pnpm db:seed:visa --apply --development
```

The first command validates and previews without database writes. Applying is
atomic, blocked when `NODE_ENV=production`, and uses stable IDs with an advisory
lock. Reruns skip existing records; they never overwrite admin edits or delete
data. All input passes the same validation and publishing rules as the admin UI.

## October 2 development cleanup

Before this seed, two test catalog listings and their linked visa request were
removed. A private `visa_dev_backup_20261002` schema preserves the two listings,
four checklist records, four listing events, one application, one traveler, two
document records, and eight application events. Their R2 objects were preserved.
Users, flights, payments, unrelated tables, and previous archives were untouched.

## Verification on October 2

- Migration applied; only `price_minor` remains in the active catalog schema.
- Initial seed: three published tourism listings and ten document requirements
  verified in PostgreSQL.
- Second apply skipped all three without duplicates or overwrites.
- 111 visa/currency regression tests and two real PostgreSQL lifecycle tests passed.
- TypeScript, focused ESLint, and production build passed.
- No browser, live R2, email, or deployed end-to-end testing was performed.

### Multiple-option extension

- Added three business listings without changing existing tourism listings.
- Verified six published listings and 22 document requirements in PostgreSQL.
- Catalog/runtime-boundary tests: 32 passed; opt-in database lifecycle test skipped.
- TypeScript and seed ESLint passed. No browser testing was performed.
