# Aslaaa PT

Aslaaa PT is the internal point-table and operations workspace for ASLAAA ESPORTS. It ships as a monorepo with:

- `apps/api`: Express + TypeScript backend
- `apps/web`: React + Vite frontend
- `supabase/migrations`: PostgreSQL schema and constraints

## Core capabilities

- Cookie-based authentication with frontend and backend RBAC
- Dynamic scrim structure: `scrim -> tier -> group -> lobby`
- Live lobby editing with autosave, rank sorting, and point recalculation
- Custom merges and favorite merge presets
- Daily snapshot archive and manual automation execution
- Unique team registry with strict parser and import reporting
- Suggestions, achievements, user management, activity logging, and Excel export

## Demo credentials

- `ADMIN_MASTER` / `Admin@123`
- `PT_SAHA` / `Pt@123`

## Quick start

### Fast local demo with memory storage

1. Create `apps/api/.env` with:

```env
NODE_ENV=development
DATA_STORAGE_DRIVER=memory
AUTH_STORAGE_DRIVER=memory
CORS_ORIGIN=http://localhost:5173
APP_ORIGIN=http://localhost:5173
```

2. Run:

```bash
npm install
npm run dev
```

### PostgreSQL-backed run

1. Provision PostgreSQL.
2. Apply every SQL file in `supabase/migrations` in filename order.
3. Create `apps/api/.env` with `DATABASE_URL` and `DATA_STORAGE_DRIVER=postgres`.
4. Run:

```bash
npm install
npm run bootstrap
npm run dev
```

## Verification commands

```bash
npm run typecheck
npm run build
```

## Script reference

- `npm run dev`
- `npm run dev:api`
- `npm run dev:web`
- `npm run bootstrap`
- `npm run typecheck`
- `npm run build`

## Documentation map

- [INSTALLATION.md](./INSTALLATION.md)
- [ENVIRONMENT.md](./ENVIRONMENT.md)
- [AUTH_FLOW.md](./AUTH_FLOW.md)
- [ROUTING_GUIDE.md](./ROUTING_GUIDE.md)
- [ROLE_SYSTEM.md](./ROLE_SYSTEM.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [MERGE_ENGINE.md](./MERGE_ENGINE.md)
- [AUTOMATION_SYSTEM.md](./AUTOMATION_SYSTEM.md)
- [UNIQUE_TEAMS.md](./UNIQUE_TEAMS.md)
- [EXPORT_SYSTEM.md](./EXPORT_SYSTEM.md)
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [SECURITY.md](./SECURITY.md)
