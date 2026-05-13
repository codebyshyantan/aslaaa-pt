# Installation

## Requirements

- Node.js 20+
- npm 10+
- Optional: PostgreSQL 15+ for persistent storage

## Install dependencies

```bash
npm install
```

## Memory mode

Use memory mode for a zero-dependency local demo.

Create `apps/api/.env`:

```env
NODE_ENV=development
DATA_STORAGE_DRIVER=memory
AUTH_STORAGE_DRIVER=memory
CORS_ORIGIN=http://localhost:5173
APP_ORIGIN=http://localhost:5173
```

Run:

```bash
npm run dev
```

## PostgreSQL mode

Create `apps/api/.env`:

```env
NODE_ENV=development
DATA_STORAGE_DRIVER=postgres
AUTH_STORAGE_DRIVER=postgres
DATABASE_URL=postgres://user:password@host:5432/aslaaa_pt
CORS_ORIGIN=http://localhost:5173
APP_ORIGIN=http://localhost:5173
```

Apply migrations from `supabase/migrations` in order, then run:

```bash
npm run bootstrap
npm run dev
```

## Validate the install

```bash
npm run typecheck
npm run build
```
