# OpenCode — Case codebase conventions

## Commands
- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm run lint` — ESLint (next lint)
- `npm run type-check` — TypeScript type check (`tsc --noEmit`)
- `npx playwright test` — all E2E tests
- `npx playwright test tests/e2e/flows.spec.ts` — single test file
- `npx playwright test --grep "test name"` — single test by name

## Project structure
- `app/` — Next.js App Router pages and API routes
- `lib/` — shared utilities, DB queries, types, AI, Supabase clients
- `components/` — reusable React components (client/server agnostic)
- `tests/e2e/` — Playwright end-to-end tests
- `public/` — static assets, PWA manifest, service worker
- `supabase/migrations/` — SQL migrations
- `database/` — schema + migration scripts

## Code style
- **Imports**: use `@/` path alias (e.g. `import { ... } from '@/lib/types'`). Group: external → internal → styles. No blank lines between groups.
- **Formatting**: single quotes, semicolons, 2-space indent. No trailing commas in function params (but use them in objects/arrays).
- **Types**: prefer `interface` for objects, `type` for unions/primitives. Use `| null` instead of `| undefined` for optional DB fields. Name types PascalCase, props `interface Props`.
- **Naming**: camelCase for variables/functions, PascalCase for components/types, snake_case for DB columns and URL query params.
- **React/Next**: `'use client'` at top of client components. Server components are default (async + direct DB calls). Route handlers use `export async function GET/POST(req: NextRequest)`.
- **CSS**: CSS Modules (`*.module.css`) with kebab-case class names. Design tokens via CSS custom properties (`var(--ink)`, `var(--paper)`, `var(--brass)`, etc. — see `app/globals.css`).
- **Error handling**: route handlers wrap in try/catch, return `NextResponse.json({ error })` with appropriate status. Client components show errors in state + UI banners.
- **API routes**: validate required fields early, return 400. Auth check at top, return 401/403. Log server errors with `console.error`.
- **Tests**: Playwright, flat `test.describe` / `test()`, `page.goto('/...')`, prefer `toBeVisible()` over `toBeInTheDocument()`.
