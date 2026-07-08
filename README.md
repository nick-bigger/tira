# Tira

A tiny app for two people to rank every tiramisu place they've tried, Beli-style: three tiers
(Liked It / It Was Okay / Didn't Like It), pairwise comparisons to place a new spot within its
tier, and a derived 0-10 score.

Stack: Vite + React + TypeScript, TanStack Router, Tailwind v4 + shadcn/ui, Turso (hosted SQLite)
via `@libsql/client`, deployed to GitHub Pages via Actions. Password-gated client-side (see
`src/lib/auth.ts`) - not real security, just keeps casual visitors out.

## Local development

```bash
npm install
npm run dev
```

Requires a `.env.local` with `VITE_APP_PASSWORD_HASH`, `VITE_TURSO_DB_URL`, and
`VITE_TURSO_AUTH_TOKEN`. See `AGENTS.md` for details.
