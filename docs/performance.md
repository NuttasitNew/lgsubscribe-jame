# Performance checks

Use a production build (`npm run build` then `npm run start -- --port 3100`), not `next dev`.

```sh
# Interactive module graph for the actual Turbopack build
npm run analyze
# Shareable analyzer files: .next/diagnostics/analyze (copy before the next build)
npm run analyze:save

# Four sales routes, standard Lighthouse mobile settings, fresh browser per run
npm run lighthouse -- https://www.lgthailand-subscribe.com --runs=3 --check
# Desktop
npm run lighthouse -- https://www.lgthailand-subscribe.com --desktop --runs=3 --check
# One route or a custom list
npm run lighthouse -- http://localhost:3100 --routes=/,/faq/ --check
```

Reports (HTML, JSON, summary) are saved under `.reports/lighthouse/` and ignored by Git. `--check` fails if **any** run/category is below 99; change the explicit budget with `--min-score=N`. No audits, tracking scripts, popup, or network requests are disabled by the runner. Mobile uses the Lighthouse defaults (simulated network and 4x CPU slowdown). Desktop is a separate preset; do not compare desktop scores to a mobile baseline.

A localhost run does not exercise the CDN, production GA4, or Vercel Analytics. Validate the public custom domain after deployment. Scores vary with network/server conditions and are lab measurements, not proof that real-user Core Web Vitals or every accessibility requirement passes.

## Image delivery

Next Image serves responsive AVIF/WebP instead of original full-size images. The automatic campaign popup and mobile hero use small pre-compressed AVIF data URLs in server-rendered HTML to avoid an additional network round trip. Desktop hero and fallback popup sizes use versioned static AVIF files. This increases HTML size and repeats image bytes across documents; it is a deliberate tradeoff for these two critical images. The popup reserves a square image area while streamed HTML arrives. The popup still opens automatically during its campaign, remembers dismissal per session, and uses the same LINE contact action.

When changing campaign artwork:

```sh
npm run optimize:images
```

Commit `lib/subscribe-day-image.json`, `lib/subscribe-day-image-inline.json`, `lib/home-hero-image.json`, and the new files in `public/images/optimized/` together with campaign changes. Generated filenames include the source/settings hash and use immutable caching; do not replace existing versioned files with different contents. The original artwork remains unchanged. Inspect the smallest generated image for text readability.

## Implementation notes

- Next experimental `inlineCss` removes the blocking stylesheet request at the cost of larger HTML. Recheck this option when upgrading Next.
- Search UI is code-split; route checks and non-product page labels do not import the full catalog.
- The product catalog renders its initial list on the server. Only URL filter synchronization is inside Suspense, avoiding a placeholder that pushes the footer down after loading.
- Live count server/hydration snapshots are deterministic, then update from the browser clock; the regression test simulates cached HTML and a later browser time.
- Campaign HTML arrives before main content. A small pre-paint script respects campaign dates/session dismissal; the root hydration suppression is limited to the HTML attribute this script sets.
- Text/link contrast and accessible button/link names were corrected. Automated accessibility scores still require manual keyboard/screen-reader review.
- GA4 contact tracking is retained. Vercel Analytics renders only on Vercel because its script endpoint does not exist on a plain local server.

## Measured production results (2026-09-13)

Public domain, standard Lighthouse 13.4.1 mobile preset, automatic campaign popup and production analytics enabled. Baseline homepage: **69 / 93 / 96 / 100**, LCP **15.8 s**, approximately **7.2 MiB** transferred. The final homepage run below transferred approximately 0.8 MiB. Category order: Performance / Accessibility / Best Practices / SEO.

| Route | Scores | LCP |
| --- | --- | --- |
| `/` | 99 / 100 / 100 / 100 | 1.65 s |
| `/products/` | 69 / 100 / 100 / 100 | 6.27 s |
| `/products/lg-washtower-wt1410nheg/` | 93 / 100 / 100 / 100 | 3.22 s |
| `/contact/` | 73 / 100 / 100 / 100 | 5.53 s |
| `/faq/` | 95 / 100 / 100 / 100 | 2.74 s |
| `/authorized/` | 95 / 100 / 100 / 100 | 2.91 s |
| `/what-is-lg-subscribe/` | 98 / 100 / 100 / 100 | 2.28 s |
| `/application-guide/` | 100 / 100 / 100 / 100 | 1.69 s |
| `/service-and-maintenance/` | 100 / 100 / 100 / 100 | 1.54 s |

**The all-routes 99 budget is not met.** These are individual final-build runs, not a guarantee. The immediately preceding homepage repeat set scored 99, 97, 98; it predates the final popup CTA-space reservation. The final mobile set is saved in `.reports/lighthouse/2026-09-13T04-56-18.813Z-mobile/`. Keep low results alongside high results when evaluating changes. Remaining work is to investigate image render/simulation variability and the large catalog page; do not disable the campaign or GA4 to make an audit pass.

The native Turbopack module report is saved locally under `.reports/bundle-inline-final/`. Its largest application data modules are catalog products (~8.4 KB compressed) and product knowledge (~6.7 KB compressed); the largest runtime module is React DOM (~63 KB compressed). These are module estimates, not additive per-route network totals. Search-related imports were separated from non-product route checks.

Validation: Vercel production build compiled, type-checked, and generated 100 static pages. ESLint has zero errors (13 pre-existing warnings). Full Vitest run: 139 passed, 5 skipped, 1 failed because the pre-existing local deletion of `knowledge/เอกสารประกอบการสอน LG Subscribe /2026/TV AV_SUB.pdf` leaves 41 PDFs while the inventory expects 42. That deletion is excluded from this change. Popup/server hydration regression tests: 9 passed. In-app browser checks confirmed popup dismissal persists through navigation and the lazily loaded product search dialog opens. Production GA4 collect requests still returned HTTP 204.

Desktop final check: homepage, catalog, WashTower detail, and contact each scored **100 / 100 / 100 / 100**. Reports: `.reports/lighthouse/2026-09-13T04-58-12.366Z-desktop/`. This is a separate preset and does not override the mobile failures.
