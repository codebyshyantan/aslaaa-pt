# Unique Teams

## Accepted input

- `slot 1 - Team Alpha`
- `slot 2: Team Bravo`
- `slot 3 -> Team Charlie`

## Rejected input

- `invalid@@format`
- `# comments`
- malformed slot syntax
- rows with missing team names
- random free text

## Import behavior

1. Parse strict slot lines
2. Normalize whitespace
3. Uppercase normalized names for dedupe
4. Reject duplicate rows inside the import batch
5. Reject names that already exist in the registry
6. Return a structured import report

## Outputs

- registered teams
- duplicate list
- invalid-line list
- Excel export from the admin page
