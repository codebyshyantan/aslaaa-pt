# Automation System

## Components

- point-system settings
- auto-merge configs
- execution plans
- automation run history
- immutable daily snapshots

## Reset lifecycle

```mermaid
flowchart TD
  A["Admin runs config"] --> B["Resolve config + favorite preset"]
  B --> C["Collect linked lobby entries"]
  C --> D["Merge standings with current point system"]
  D --> E["Insert daily snapshot"]
  E --> F["Clear live lobby entries for scrim"]
  F --> G["Insert automation run log"]
  G --> H["Record automatic achievement"]
```

## Key guarantees

- one config per scrim
- one run per config per date
- one snapshot per scrim per date
- snapshots remain immutable

## APIs

- `GET /api/auto-merge/configs`
- `POST /api/auto-merge/configs`
- `GET /api/auto-merge/configs/:id/plan`
- `POST /api/auto-merge/configs/:id/run`
- `GET /api/auto-merge/runs`
- `GET /api/auto-merge/point-system`
- `PUT /api/auto-merge/point-system`
- `GET /api/auto-merge/snapshots`
