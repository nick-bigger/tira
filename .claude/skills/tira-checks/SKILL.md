---
name: tira-checks
description: Run lint, format, typecheck, and build for the Tira project. Use before committing changes to this repo, or when asked to check/lint/format/build/typecheck it.
---

Run these from the `tira` project root:

- `npm run lint` - oxlint (correctness) + `prettier --check .` (Tailwind class order + import order)
- `npm run format` - auto-fixes whatever `lint` flags for formatting/ordering
- `npx tsc -b` - typecheck only, no build output
- `npm run build` - typecheck + production build; also regenerates `src/routeTree.gen.ts`, which
  must be committed after any route change (see AGENTS.md)

There is no test suite yet.
