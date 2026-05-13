# Database Schema

## Core entities

```mermaid
erDiagram
  users ||--o{ sessions : owns
  users ||--o{ audit_logs : writes
  users ||--o{ suggestions : submits
  users ||--o{ achievements : creates
  users ||--o{ activity_logs : acts

  scrims ||--o{ scrim_tiers : contains
  scrim_tiers ||--o{ scrim_groups : contains
  scrim_groups ||--o{ lobbies : contains
  lobbies ||--o{ lobby_entries : stores

  scrims ||--o{ merge_presets : owns
  merge_presets ||--o{ merge_preset_lobbies : maps
  lobbies ||--o{ merge_preset_lobbies : maps

  scrims ||--o{ auto_merge_configs : configures
  merge_presets ||--o{ auto_merge_configs : favorite
  scrims ||--o{ daily_snapshots : archives
  merge_presets ||--o{ daily_snapshots : produces

  auto_merge_configs ||--o{ automation_runs : executes
  daily_snapshots ||--o{ automation_runs : references
  scrims ||--o{ automation_runs : tracks
```

## Important tables

- `users`, `sessions`, `audit_logs`
- `teams`
- `scrims`, `scrim_tiers`, `scrim_groups`, `lobbies`, `lobby_entries`
- `merge_presets`, `merge_preset_lobbies`
- `auto_merge_configs`, `daily_snapshots`, `automation_runs`
- `suggestions`, `achievements`, `activity_logs`
- `system_settings`

## Safety constraints

- unique usernames
- unique refresh token hashes
- unique normalized team names
- one auto-merge config per scrim
- one daily snapshot per scrim per date
- one automation run per config per date
- immutable `audit_logs`
- immutable `daily_snapshots`

## Settings storage

- `system_settings.key = 'point-system'`
- value JSON stores `killPointValue` and `positionPoints`
