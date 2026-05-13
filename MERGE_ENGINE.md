# Merge Engine

## Purpose

The merge engine combines standings from multiple live lobbies into one merged point table.

## Inputs

- selected lobby ids for a custom merge
- or a saved `merge_preset`
- current point-system settings

## Calculation model

Each lobby row contributes:

- team name
- normalized team name
- kills
- placement points
- total points

Merged standings aggregate by normalized team name:

- total kills
- total placement points
- total points
- matches played
- source lobbies

Sorting order:

1. total points desc
2. kills desc
3. placement points desc
4. best position asc
5. normalized team name asc

## API surface

- `POST /api/scrims/merge-preview`
- `GET /api/scrims/merge-presets/:id/standings`
- `POST /api/scrims/merge-presets`

## Favorite merges

- Favorite presets are persisted per scrim.
- A favorite preset can be linked to auto-reset configuration.
- Saving a new favorite preset for a scrim clears the previous favorite flag on that scrim.
