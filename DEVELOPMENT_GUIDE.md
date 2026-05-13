# Development Guide

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## App layout

- `apps/api/src/contracts`: shared route and scoring contracts
- `apps/api/src/modules`: backend modules
- `apps/web/src/features`: frontend features by route/domain
- `supabase/migrations`: SQL schema history

## Local workflow

1. Start in memory mode for UI and API iteration.
2. Switch to PostgreSQL mode when schema behavior matters.
3. Run `npm run typecheck` after contract or API changes.
4. Run `npm run build` before closing work.

## Important conventions

- Route authority is centralized in `apps/api/src/contracts/app-contract.ts`.
- Shared scoring logic is centralized in `apps/api/src/contracts/competition-contract.ts`.
- Snapshots and auth audits are append-only records.
