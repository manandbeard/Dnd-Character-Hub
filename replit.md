# Workspace

## Overview

**DDnD** — A comprehensive D&D 5e character builder and campaign management tool with AI features. pnpm workspace monorepo using TypeScript.

## Project Roadmap

- **Phase 1** (COMPLETED): Auth + DB schema + SRD data + OpenAPI codegen + backend routes + React frontend
- **Phase 2** (planned): Campaign management + shared party ledger
- **Phase 3** (planned): AI workflows (NPC generation, encounter suggestions, backstory)
- **Phase 4** (planned): Social discovery (share characters, public profiles)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: Clerk (@clerk/express + @clerk/react)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Fonts**: Playfair Display (serif headings) + Inter (body)
- **Build**: esbuild (CJS bundle)

## Artifacts

| Artifact | Port | Path | Description |
|---|---|---|---|
| D&D Character Builder | 18703 | `/` | React+Vite frontend (`@workspace/dnd-app`) |
| API Server | 8080 | `/api` | Express backend (`@workspace/api-server`) |

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/scripts run seed-srd` — seed the DB with SRD races/classes/backgrounds/spells/items

## Key Files

### Backend (`artifacts/api-server/src/`)
- `app.ts` — Express app with Clerk middleware + all route mounts
- `routes/` — characters, inventory, races, classes, backgrounds, spells, items, users
- `lib/rules-service.ts` — D&D 5e rules engine (ability modifiers, proficiency bonus, skills, saving throws, spell DC, HP, passive perception)
- `middlewares/requireAuth.ts` — Clerk session auth middleware
- `middlewares/clerkProxyMiddleware.ts` — Clerk FAPI proxy (production only)

### Frontend (`artifacts/dnd-app/src/`)
- `main.tsx` — ClerkProvider with `VITE_CLERK_PROXY_URL` (env-driven, dev=none)
- `App.tsx` — auth-guarded routes via wouter
- `index.css` — dark leather/parchment theme (crimson red accent, Playfair Display serif)
- `components/layout/AppLayout.tsx` — sidebar nav layout
- `pages/` — landing, characters (roster), character-new (4-step wizard), character-sheet (5 tabs), character-level-up, spells (compendium), items (compendium), account

### Schema (`lib/db/src/schema/`)
- `users.ts`, `characters.ts`, `ability_scores.ts`, `character_inventory.ts`
- `races.ts`, `classes.ts`, `backgrounds.ts`, `spells.ts`, `items.ts`

### Data (`scripts/src/`)
- `seed-srd.ts` — SRD seeder: 9 races, 12 classes, 6 backgrounds, 15 spells, 15 items

### API Spec
- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/api-client-react/src/generated/` — auto-generated React Query hooks + Zod schemas (do not edit)

## Important Notes

- User IDs are Clerk string IDs (text PK). Character IDs are serial ints.
- `requireAuth` reads `auth.sessionClaims.userId ?? auth.userId` and attaches to `req.userId`.
- Clerk proxy is production-only (the `clerkProxyMiddleware` returns `next()` in dev).
- `VITE_CLERK_PROXY_URL` is automatically set by Replit in production; undefined in dev.
- The dnd-app workflow uses `PORT=18703 BASE_PATH=/ pnpm --filter @workspace/dnd-app run dev` (env vars inlined in command due to artifact env injection issue).
- Health endpoint is at `/api/healthz`.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
