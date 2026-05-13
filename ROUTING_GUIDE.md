# Routing Guide

## Central authority

Protected route metadata lives in:

- `apps/api/src/contracts/app-contract.ts`

Both the backend and frontend import the same route contract. That keeps:

- sidebar visibility
- session-accessible route lists
- frontend redirects
- backend route-level RBAC

in sync.

## Protected routes

| Route | Admin | PT Maker |
| --- | --- | --- |
| `/dashboard` | Yes | Yes |
| `/scrims` | Yes | Yes |
| `/tournaments` | Yes | Yes |
| `/merges` | Yes | Yes |
| `/exports` | Yes | Yes |
| `/unique-teams` | Yes | No |
| `/suggestions` | Yes | Yes |
| `/achievements` | Yes | Yes |
| `/settings` | Yes | No |
| `/users` | Yes | No |

## Frontend enforcement

- `ProtectedRoute` blocks unauthorized direct URL access.
- Unauthorized users are redirected to their default allowed route.

## Backend enforcement

- API routers use `middleware.requireRouteAccess(...)` where route-level synchronization matters.
- Additional `requireRole(...)` checks still protect write operations that are stricter than page visibility.
