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

The LINE webhook stores raw events, LINE profiles, messages, chat summaries, and daily activity in Neon Postgres. The backoffice is intentionally available only in local preview mode until real authentication is connected.

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

The trailing slash is intentional because this project uses trailing-slash routes. A production backoffice needs an authentication provider before the local-only guard can be removed.

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
