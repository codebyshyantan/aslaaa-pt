# Security

## Authentication

- HTTP-only session cookie
- server-side session resolution
- rate-limited login endpoint
- invalid-session cleanup on `401`

## Authorization

- shared route contract for frontend and backend
- route-level redirect protection in `ProtectedRoute`
- backend `requireRouteAccess(...)` and `requireRole(...)`

## Data integrity

- immutable `audit_logs`
- immutable `daily_snapshots`
- unique team normalization
- unique automation configs and runs
- foreign keys on scrim, merge, lobby, and snapshot relations

## Operational logging

- request-id middleware
- morgan request logs
- auth audit logs
- domain activity logs

## Sensitive defaults

Demo accounts exist for local bootstrap. Rotate or replace them in any shared or public deployment.
