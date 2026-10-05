This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## LINE webhook and backoffice

The LINE webhook stores raw events, LINE profiles, messages, chat summaries, and daily activity in Neon Postgres. The analytics backoffice uses password authentication; the legacy LINE design dashboard at `/backoffice/line/` remains local-only.

1. Pull the Vercel Development environment after connecting the Neon Marketplace resource:

   ```bash
   npx vercel@latest env pull .env.local --environment=development --yes
   ```

2. Add `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, and `BACKOFFICE_DESIGN_PREVIEW=true` to `.env.local`. Never commit their values.

3. Apply database migrations and start the app:

   ```bash
   npm run db:migrate
   npm run dev
   ```

4. Open [http://localhost:3000/backoffice/](http://localhost:3000/backoffice/). After deployment, configure LINE Developers to send events to:

   ```text
   https://your-domain.example/api/line/webhook/
   ```

The trailing slash is intentional because this project uses trailing-slash routes.

### Website traffic and backoffice login

- Set `BACKOFFICE_USERNAME` (defaults to `admin`), `BACKOFFICE_PASSWORD_HASH` (`scrypt:<32 hex salt>:<128 hex hash>`; scrypt uses the hex salt string and a 64-byte output), and a random `BACKOFFICE_SESSION_SECRET` of at least 32 characters. Passwords are never stored in plain text. Sessions expire after eight hours and password/secret changes invalidate them. Login attempts are limited in Postgres across serverless instances.
- Set `WEB_ANALYTICS_ENABLED=true` and a separate random `WEB_ANALYTICS_SECRET` of at least 32 characters on the intended deployment. Keep the analytics secret stable. Development and production must use separate databases. Deploy the committed migration with `prisma migrate deploy` before enabling traffic collection; do not use `db push` against production.
- `/backoffice/analytics/` provides six recent month shortcuts, any-month selection, inclusive Bangkok start/end dates (maximum 366 days), distinct visitors across the whole period, a daily graph/table including zero-traffic days after collection begins, and top pages. `/backoffice/` redirects there. Invalid dates and database failures are displayed explicitly.
- After analytics consent, public navigation and contact clicks record idempotent events using the server's time. A one-year HttpOnly anonymous visitor cookie and a renewable 30-minute session cookie identify the browser/session; only HMAC hashes are stored. Events include path, source/medium, sanitized UTM campaign, referrer hostname, device, optional Vercel country code, and contact method. Raw IPs, full referrers, arbitrary query strings, and backoffice visits are excluded. Google click IDs are hashed only with advertising consent. Source signals persist within the browser session across internal navigation. Changing devices/clearing cookies can count another visitor.
- `components/tracking-consent.tsx` offers necessary-only, analytics, or analytics plus advertising choices and allows changes. Do Not Track/Global Privacy Control override tracking choices. Withdrawal removes first-party cookies and updates Google's consent state. The existing GA4 tag `G-1P70VTZQZH` loads only on the production domain after analytics consent, with explicit SPA pageviews and contact events. Advertising consent gates Google click IDs/ad storage; personalization remains disabled. Vercel's existing independent, cookieless analytics remains unchanged.
- Schema migration and environment changes must precede production deployment. Local `.env.production.local` edits do not update Vercel automatically.

### Google Ads + GA4 daily snapshots

- The browser-confirmed LG account is `758-859-7274` and the GA4 property is `553934775`, with the stream `15767751903` and tag `G-1P70VTZQZH`. GA4 is already linked to Ads. The existing GA4 `contact_click` import is Secondary and active; the separate Primary `Outbound click` had no recorded data at the October 5 inspection. This implementation preserves those account settings and keeps contact clicks distinct from sales.
- Configure `GOOGLE_ADS_CUSTOMER_ID`, `GA4_PROPERTY_ID`, and a dedicated random `GOOGLE_REPORT_SYNC_SECRET` (32+ characters). The authenticated `/api/backoffice/google-script/` download builds the script for this account and the configured site. It contains a sensitive inbound sync secret and is returned with `private, no-store`.
- Use the Google Ads download in Google Ads > Tools > Bulk actions > Scripts (no Advanced API dependency). Use the GA4 download (`?source=ga4`) in a separate Google Apps Script project with the AnalyticsData service. The observed Google Ads Advanced APIs dialog exposed legacy Analytics v3, so it is not used for GA4. Authorize each script and schedule daily after the production endpoint is deployed. Both exporters read reports and send complete daily snapshots; they contain no campaign/budget mutations. Google authorization must be reviewed because the platform's requested permissions can be broader than this script's operations.
- Each run refreshes the previous 35 completed Bangkok days so late conversions are updated. `BACKFILL_FROM` and `BACKFILL_UNTIL` can import an older period, up to 366 days in one run. The backoffice history section generates scripts for the selected start/end range; incomplete current days are excluded. Each provider can only return historical data it actually collected. Ads captures daily campaign impressions/clicks/cost/Primary and All conversions; GA4 captures daily active users/sessions/views and contact clicks by session source/medium. Reports are fetched before uploading, paginated, and tagged for thresholding/sampling/other-row loss. API errors never produce fake zero snapshots.
- `/api/analytics/google-sync/` validates account IDs, dates, currency/timezone, finite metrics and an HMAC over the raw request body plus a five-minute timestamp. One atomic daily upsert replaces prior data; older snapshots cannot overwrite newer ones. Google metrics remain separate from first-party events. Daily active users are never summed to claim unique users for the full date range.
- Until the production endpoint, account authorization and scheduling are complete, backoffice displays “รอเชื่อมต่อเพื่อรับรายงานจริง”; local tests are not proof of a live Google sync.
- Prepared private drafts in the LG account: Ads script `12445193` (“LG Subscribe - Daily Google Ads Reports”) and Apps Script project `1T6-dmrnj0_gYxgPkeegNV16Oms5t-2aQseteu1uIZaXZNyCBsj6UizoW` (“LG Subscribe - Daily GA4 Reports”). Their receiver secret remains a placeholder until production setup. For GA4, `?source=ga4_manifest` downloads `appsscript.json` with the AnalyticsData v1beta dependency and only `analytics.readonly` plus external HTTP transport scopes. Account grant and live executions remain pending.

Run the additional development database checks with `RUN_WEB_ANALYTICS_INTEGRATION=true npm run test -- test/web-analytics-database.integration.test.ts test/google-sync-database.integration.test.ts`.

Run the real-database integration test only against a disposable or development database:

```bash
RUN_DATABASE_INTEGRATION=true npm run test -- test/line-webhook-database.integration.test.ts
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
