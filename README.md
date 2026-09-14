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

The LINE webhook stores raw events, LINE profiles, messages, chat summaries, and daily activity in Neon Postgres. The backoffice now includes authenticated SEO tracking at `/backoffice/seo/`.

See [SEO tracking and environment setup](docs/seo/tracking.md) for the development/production Neon branches, login credentials, CSV import, Search Console connection, and release prerequisites.

For local development, use `.env.development.local` with the development branch and `BACKOFFICE_DESIGN_PREVIEW=true`, then run `npm run db:deploy` and `npm run dev`. Never point this environment at the production branch. Production requires administrator authentication and explicit production database settings.

The LINE webhook endpoint remains `/api/line/webhook/`; preserve its credentials and data routing when preparing a release.

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
