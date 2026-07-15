## Why

README and reto US-11/US-12 still describe “the domain event generates/hashes/updates the password,” while the implementation awaits `FinalizeMissingPasswordService` and publishes `UserCreatedEvent` with no mutating `@EventsHandler`. ADR/OpenSpec already match code; evaluator-facing docs do not — hiring-signal drift, not a runtime bug.

## What Changes

- Align README intro and US-11/US-12 notes/checkboxes with ADR-0002: application finalize is the sole mutator; event is audit/signal after insert/finalize.
- Optionally add a thin non-mutating `@EventsHandler(UserCreatedEvent)` (log only) if a handler **file** is required for checklist optics — without reintroducing dual password writes.
- Prefer docs-first unless apply decides a thin listener is cheaper for the evaluator story.

## Source findings

- FINDING-001 — Challenge narrative still says the event generates the password

## Non-goals

- Restoring password generation inside an `@EventsHandler` as the request-path await strategy.
- Reintroducing dual invoke (await finalize + mutating event handler).
- Changing password policy, compensate, or uniqueness behavior.

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `users`: Clarify that `UserCreatedEvent` is a domain signal; missing-password password write is owned by the awaited finalize path on create.

## Impact

- `README.md`, `docs/requirements/reto.md` (US-11/US-12), possibly ADR-0002 wording polish.
- Optional: non-mutating event handler file under `application/events/handlers/`.
