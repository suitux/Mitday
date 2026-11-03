# Quadra

Group scheduling: a creator makes a plan, shares a link, guests paint the days/slots/hours they can make, Quadra marks the best cell, the creator closes it and everyone gets a calendar event. Full spec and phases: `PLAN.md`.

@AGENTS.md

## Stack

- Next.js 16 App Router (Turbopack), React 19, TypeScript strict (`noUncheckedIndexedAccess`). `cacheComponents` is **off** on purpose (almost every route reads cookies).
- `src/proxy.ts` (Next 16's middleware) = next-intl routing + Auth.js route protection (`/[locale]/dashboard`, `/[locale]/plans/*`). Server actions re-check auth themselves; never rely on the proxy alone.
- Auth.js v5 (`next-auth@beta`): Google + Resend magic link, Drizzle adapter, JWT sessions. `src/auth.config.ts` is the DB-free part used by the proxy. A `test-login` credentials provider exists only when `AUTH_TEST_LOGIN=1` and not in production (`src/lib/env.ts`).
- Drizzle ORM. Neon (`neon-serverless`) in production; local docker Postgres uses `node-postgres` automatically when `DATABASE_URL` points at localhost (`src/db/index.ts`).
- next-intl: `es` (default), `ca`, `en`; every route under `[locale]`. Messages in `messages/*.json` — keep the three files with identical keys (a unit test enforces it).
- UI: Tailwind v4 + shadcn/ui (radix). Design follows the taste-skill "achromatic ledger" app sheet: ink chrome, colour only on data (answers) and `--hue` for the best cell / final date. Light/dark via `prefers-color-scheme`.

## Domain map

- `src/lib/cells.ts` — cell encoding: `YYYY-MM-DD` (day), `YYYY-MM-DD@<slotId>` (slot), `YYYY-MM-DDTHH:mmZ` UTC start instant (hour).
- `src/lib/grid.ts` — valid cells of a plan (isomorphic; DST-safe with `@date-fns/tz`).
- `src/lib/aggregate.ts` — scores, intensity, best cells (ties: more max-weight answers, then earliest date).
- `src/lib/plan-view.ts` — what the participant page may send about others per `visibility` (`hidden` sends nothing).
- `src/lib/guest.ts` + `src/server/participant.ts` — guest identity (cookie `quadra_p_<planId>` = `<participantId>.<token>`, only sha256 stored).
- `src/server/actions/*` — all mutations; return `ActionResult` (`{ ok, data } | { ok: false, error }`), error codes translated under `errors.*`.
- `src/server/notify.ts` — emails (React Email templates in `src/emails`), sent with `after()`. Without `AUTH_RESEND_KEY` emails are printed to the server console.

## Commands

- `pnpm db:up` (docker Postgres on :54329) · `pnpm db:generate` · `pnpm db:migrate`
- `pnpm dev` · `pnpm build`
- `pnpm check` = typecheck + lint + prettier + vitest. Keep it green.
- `pnpm test:e2e` — Playwright against `next dev` on :3100 with the test login. `SHOTS=1 pnpm exec playwright test e2e/screens.spec.ts` captures screenshots for visual review.
