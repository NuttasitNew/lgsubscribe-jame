# SEO tracking and environment separation

## What is implemented

- `/backoffice/seo/`: keyword targets, target page, cluster/priority, country (ISO alpha-3), device, target rank, pause/resume, persisted history and CSV export.
- Initial 22-keyword set is idempotent. The previously proposed cancellation keyword is omitted to respect the existing public-content boundary. Category target URLs now have pages.
- Search Console Queries CSV import supports English/Thai column headers, quoted values and UTF-8 BOM. Select the same period/country/device and Web type as the exported report. Do not use compare-mode exports or exports filtered to a particular page: these are keyword-level property metrics. Reimporting the same keyword, period and source updates it rather than adding it again. API and CSV are separate histories.
- Authenticated, read-only Google Search Console API sync for active targets (maximum 100). It uses exact case-insensitive escaped query regex, country/device filters, finalized data, property-level metrics and a separate top-clicked-page lookup. Missing rows are `NO_DATA` with null metrics, never zero rank or proof of deindexing. CSV cannot infer absence; rows not in an export remain unknown.
- Dashboard shows latest measurements per keyword for the chosen source. Counts are not site totals and latest periods may differ. Comparison is only against the preceding non-overlapping equal-length period from the same source. CTR is clicks / impressions. Page lookup is top by clicks, not necessarily Google's canonical or best position.
- Export includes every saved period and its source. Do not sum overlapping windows or sources. Spreadsheet formula-leading values are escaped.
- `/api/cron/seo/` requires a random `CRON_SECRET` of at least 32 characters. Vercel schedule is Monday 01:00 UTC (08:00 Bangkok), querying the latest 28 days ending 3 Pacific calendar days earlier. This is configuration for the next deployment, not an already-running job. Each API import is committed atomically, and failures are recorded without overwriting successful measurements. Overlapping invocations are idempotent but can make duplicate API calls.

## Database provisioning completed 2026-09-14

Neon project `lgsubscribe-line` (`winter-hall-01340367`), Singapore:

| Branch      | ID                         | Use                                              |
| ----------- | -------------------------- | ------------------------------------------------ |
| main        | br-red-wildflower-azpui0it | Original branch preserved                        |
| development | br-twilight-shape-azlz5unm | Current local development, cloned from main      |
| production  | br-lively-surf-azf8mgfs    | Schema-only branch, no test/customer data copied |

Created using Neon CLI 2.19.0, fixed 0.25 CU, 300-second idle suspension. Connection strings were captured into ignored files, never printed. Production schema was compared to the old Prisma schema with no difference before marking its five inherited schema migrations as applied. Both branches then received the additive SEO migration. Each was seeded with 22 keyword targets and zero measurements. LINE users/messages were zero at inspection. The original branch was not renamed/reset/migrated.

Local settings:

- `.env.development.local`: development pooled runtime URL, direct migration URL, all database aliases and `DATABASE_ENV=development`.
- `.env.production.local`: production URLs and `DATABASE_ENV=production`; local preparation only, not uploaded to Vercel.
- `.env.local`: original connection material left intact. Next loads the environment-specific file first. Prisma defaults to development and loads `.env.development.local` first. Explicit shell environment takes precedence.
- No production data is needed for builds. Backoffice data pages are dynamic and check access before reads.
- Vercel production refuses to connect unless `DATABASE_ENV=production`. Development refuses a database labelled production. Labels are an additional safeguard, not a substitute for verifying branch endpoints.

```bash
# Development only (default)
npm run db:deploy

# Apply reviewed migrations to the prepared production branch
APP_ENV=production npm run db:deploy

# Verify without disturbing an existing .next production server
NEXT_BUILD_DIR=tmp/seo-build npm run build
```

Do not run reset/db push against either shared branch. Do not use `vercel env pull .env.local` as an environment switch: configure the relevant environment-specific file and verify the host. A future Vercel release must explicitly install the production URLs and all relevant aliases rather than inheriting the old main-branch integration values. Verify existing production LINE credentials and ingestion destination before switching the runtime; no running deployment was switched in this work.

## Authentication

All private pages/data readers/actions check access. CSV export independently returns 401 without access. Login is a single administrator password stored only as an scrypt hash, with an HMAC-signed HttpOnly/SameSite cookie expiring after 8 hours. Production cookies are Secure. Password/secret rotation invalidates sessions. Sign-out clears the browser cookie; it does not revoke a stolen cookie server-side before expiry. Login attempts are database-backed, limited to 5 per 15-minute IP window (Vercel forwarding header) and fail closed when the DB is unavailable. This is single-admin access, not per-person roles/audit identity.

Local preview bypass requires NODE_ENV=development, BACKOFFICE_DESIGN_PREVIEW=true, and no VERCEL flag. Production never uses this bypass. If authentication values are absent, private pages and login return 404.

```bash
npm run backoffice:credentials -- production
```

This generates fresh credentials and a password into timestamped files under ignored `tmp/seo-setup/`, mode 0600, without printing values. It does not rotate a running system automatically. Development and production credentials were generated separately for this work and copied into their respective local env files. Deliver the password to the operator securely; never commit credentials or expose them via NEXT_PUBLIC variables.

## Google setup still required

1. Access or verify the correct Search Console property. The inspected LG account showed the welcome screen, not an accessible website report. Another account may own the property.
2. For HTML-tag verification the app supports `GOOGLE_SITE_VERIFICATION`. Domain verification instead requires the Google-provided DNS TXT record. Deployment/ownership verification is a separate external step.
3. Enable the Google Search Console API in the chosen Google Cloud project and supply a service account that is granted read access to only this property. No domain-wide delegation is needed. Store its JSON as `GSC_SERVICE_ACCOUNT_JSON` in the server secret environment and set `GSC_SITE_URL` to the exact property identifier, such as `https://www.lgthailand-subscribe.com/` or `sc-domain:lgthailand-subscribe.com`.
4. Before enabling scheduled work, use the authenticated sync button and verify an actual successful run. A populated env only means configured, not verified access. If Google provides no data, inspect indexing separately with URL Inspection.
5. Configure production database URLs, auth secrets, Google settings and CRON_SECRET in Vercel, then deploy only with explicit release authority. No Google account permission, verification, external secret, or website deployment was changed here.

## Public SEO changes

Five statically rendered category pages cover air conditioners, washing machines/WashTower, water purifiers, refrigerators and TVs. They contain category-specific selection/installation guidance from the existing knowledge library, model/package comparison, product links and application links. Home category cards and catalog navigation link to them. Each has self-canonical metadata and a public sitemap entry. Unknown per-page lastmod dates are omitted instead of assigning one old date to every page. Prices are drawn from the existing catalog, and package/contract caveats are shown; this work does not certify or change current offers.

## Verification

Final local checks: isolated production build and TypeScript passed; lint reported 0 errors and 13 pre-existing unused-variable warnings. Tests excluding the source-PDF inventory file passed 166 tests (6 opt-in integration tests skipped in that run); the SEO persistence test (1) and LINE persistence tests (5) were also run explicitly against development and passed. The full initial run identified the existing PDF inventory failure; its file is not silently counted as passing.

Real production-mode HTTP checks (using the development database) verified anonymous redirects, rejected unauthenticated mutations, real password login, Secure/HttpOnly/SameSite cookies, authenticated CSV export, keyword creation, and file CSV import twice producing one measurement with the expected rendered position/CTR/date. Test keyword/measurement/run rows were removed. Browser checks verified seeding, filtering, editing and restoring a target, and rendering the new category page. Five category routes returned HTTP 200 and matching canonicals; sitemap contains 96 public URLs. Development preview is available on port 3107; the temporary production-mode test server on port 3108 was stopped.

- Focused unit/integration coverage: CSV numeric/date/duplicate validation, auth tamper/expiry, API no-data and denied-access behavior, API aggregation, private cron access, public canonicals/sitemap and homepage navigation.
- Real Neon development integration: create keyword, reject duplicate, import twice with one history row, refuse changing identity of historical metrics, then remove test-owned data.
- Full suite exposed an existing missing source PDF (`knowledge/.../2026/TV AV_SUB.pdf`) already deleted before this task. That inventory failure was preserved, not fixed by altering counts.
- Live Google data and public ranking improvement are not verified. They require the Google connection and a deployed website, then real observation over time.

References:

- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/identity/protocols/oauth2/service-account
- https://support.google.com/webmasters/answer/7576553
- https://neon.com/docs/manage/orgs-cli
