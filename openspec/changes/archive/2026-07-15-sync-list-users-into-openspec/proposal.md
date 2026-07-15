## Why

`GET /api/v1/users` (ListUsers CQRS) already ships in the API and Swagger, but living OpenSpec and the C4 component inventory still describe only get-by-id. Spec drift weakens the evaluator “docs match runtime” signal.

## What Changes

- Add a living `users` requirement for list users (public fields, empty array OK, no secrets).
- Update C4 component list to include `ListUsersHandler`.
- Note in requirements map that list is an endpoint beyond US-15 (no need for a full new US epic unless desired).

## Source findings

- FINDING-002 — Living OpenSpec / C4 omit `ListUsers` after shipping endpoint

## Non-goals

- Pagination / page-size caps (see `cap-list-users-page-size`).
- Changing list HTTP behavior at runtime.
- CI lint / health / audit-test polish.

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `users`: Document that the system exposes `GET /api/v1/users` as a Query + Handler returning a public user list without secrets.

## Impact

- `openspec/specs/users/spec.md` (via archive sync after apply)
- `docs/infra/c4-y-flujos.md`
- Optionally `docs/requirements/reto.md` footnote / US map row
