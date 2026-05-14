# Environment Guide

The backend reads environment variables from `apps/api/.env`.

## Required for PostgreSQL

- `DATABASE_URL`

## Common variables

```env
NODE_ENV=development
PORT=4000
APP_ORIGIN=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
DATA_STORAGE_DRIVER=memory
AUTH_STORAGE_DRIVER=memory
SESSION_COOKIE_NAME=aslaaa_pt_session
SESSION_TTL_HOURS=168
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=8
COOKIE_SECURE=false
MEMORY_SEED_ADMIN_PASSWORD=Admin@123
MEMORY_SEED_PT_PASSWORD=Pt@123
```

## Variable reference

- `DATA_STORAGE_DRIVER`: `memory` or `postgres`
- `AUTH_STORAGE_DRIVER`: kept aligned with `DATA_STORAGE_DRIVER`
- `CORS_ORIGINS`: optional comma-separated allowlist for multiple frontend origins
- `SESSION_TTL_HOURS`: cookie/session lifetime
- `AUTH_RATE_LIMIT_WINDOW_MS`: login rate-limit window
- `AUTH_RATE_LIMIT_MAX`: login attempts allowed per username/IP window
- `COOKIE_SECURE`: set `true` behind HTTPS. In `production`, the API now forces `secure=true` and `sameSite=none` for session cookies.

## Frontend

Optional frontend env:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```
