# Deployment Guide

## Backend

1. Install dependencies: `npm install`
2. Set production env vars in `apps/api/.env`
3. Apply SQL migrations in `supabase/migrations`
4. Run bootstrap once: `npm run bootstrap`
5. Build: `npm run build`
6. Start API with `node apps/api/dist/server.js`

## Frontend

1. Set `VITE_API_BASE_URL`
2. Build: `npm run build --workspace @aslaaa-pt/web`
3. Serve `apps/web/dist`

## Production checklist

- HTTPS enabled
- `COOKIE_SECURE=true`
- `CORS_ORIGIN` or `CORS_ORIGINS` include the deployed Vercel frontend origin
- backend runs with `NODE_ENV=production` so session cookies are issued with `SameSite=None; Secure`
- PostgreSQL backups configured
- request logs collected
- migrations applied in order
- demo passwords rotated if public access exists
