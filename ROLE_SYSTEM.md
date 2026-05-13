# Role System

## Roles

### `ADMIN`

- Full route access
- User management
- Unique team registry
- Point-system settings
- Automation configuration and execution
- Favorite merge persistence

### `PT_MAKER`

- Dashboard
- Scrims
- Merges
- Tournaments
- Exports
- Suggestions
- Achievements

## Blocked routes for `PT_MAKER`

- `/settings`
- `/users`
- `/unique-teams`

These are blocked in both:

- the sidebar/navigation layer
- `ProtectedRoute` direct URL checks

## Demo users

- `ADMIN_MASTER` / `Admin@123`
- `PT_SAHA` / `Pt@123`
