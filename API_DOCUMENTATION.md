# API Documentation

All endpoints are rooted at `/api`.

## Auth

- `GET /auth/directory` admin only
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`

## Dashboard activity

- `GET /activity-logs?limit=20`

## Scrims and live scoring

- `GET /scrims`
- `POST /scrims` admin
- `POST /scrims/tiers` admin
- `POST /scrims/groups` admin
- `POST /scrims/lobbies` admin
- `PUT /scrims/lobbies/:id/entries`
- `POST /scrims/merge-presets` admin
- `GET /scrims/merge-presets/:id/standings`
- `POST /scrims/merge-preview`

## Automation and settings

- `GET /auto-merge/configs` admin
- `POST /auto-merge/configs` admin
- `GET /auto-merge/configs/:id/plan` admin
- `POST /auto-merge/configs/:id/run` admin
- `GET /auto-merge/runs` admin
- `GET /auto-merge/point-system` admin
- `PUT /auto-merge/point-system` admin
- `GET /auto-merge/snapshots`
- `POST /auto-merge/snapshots` admin

## Unique teams

- `GET /teams` admin
- `POST /teams/import` admin

## Suggestions

- `GET /suggestions`
- `POST /suggestions`
- `PATCH /suggestions/:id/status` admin

## Achievements

- `GET /achievements`
- `POST /achievements` admin

## Users

- `GET /users` admin
- `POST /users` admin
- `PATCH /users/:id/status` admin
