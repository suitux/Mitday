# Quadra

Find the day that works for everyone. Create a plan, share the link, and everyone paints the days (or slots, or hours) they can make. Quadra highlights the best option; close the plan and everyone gets a calendar event.

## Local setup

Requirements: Node 22+, pnpm 11, Docker.

```bash
pnpm install
cp .env.example .env.local   # then fill AUTH_SECRET (openssl rand -base64 32)
pnpm db:up                   # Postgres 17 on localhost:54329
pnpm db:migrate
pnpm dev                     # http://localhost:3000
```

Without `AUTH_RESEND_KEY`, magic links and notification emails are printed in the dev server console. Set `AUTH_TEST_LOGIN=1` locally to get a one-click test login (never available in production).

## Scripts

| Script                                 | What it does                                             |
| -------------------------------------- | -------------------------------------------------------- |
| `pnpm check`                           | Typecheck, lint, Prettier and unit tests                 |
| `pnpm test:e2e`                        | Playwright end-to-end tests (starts `next dev` on :3100) |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle migrations                                       |
| `pnpm email:dev`                       | React Email preview of the templates                     |

## Deploying (Vercel)

1. Create a Neon database (Vercel Marketplace) and set `DATABASE_URL`.
2. Set `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL` and, optionally, `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` for rate limiting.
3. Google OAuth redirect URI: `https://<domain>/api/auth/callback/google`.
4. The build (`pnpm vercel-build`) applies migrations before `next build` when `DATABASE_URL` is present.
